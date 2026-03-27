---
title: "Fine-tuning LLMs on Custom Data: LoRA, QLoRA, and PEFT Complete Guide 2026"
description: "Master fine-tuning LLMs with LoRA and QLoRA using Hugging Face PEFT and Unsloth. Complete 2026 guide covering dataset preparation, training, evaluation, and deployment."
date: "2026-03-28"
author: "DevPlaybook Team"
tags: ["fine-tuning", "lora", "qlora", "peft", "hugging-face", "llm", "python", "unsloth"]
readingTime: "14 min read"
---

Fine-tuning large language models has shifted from a research luxury to a practical production skill. With LoRA, QLoRA, and the Hugging Face PEFT ecosystem, you can adapt a 7B or 13B model to your domain on a single consumer GPU in hours — not days, not cloud bills that make you flinch.

This guide covers every decision you will face: when to fine-tune at all, how LoRA math works, what QLoRA adds, how to build a training dataset, how to run the full training loop with `SFTTrainer`, how to go 2x faster with Unsloth, and how to deploy the result to production.

---

## 1. When to Fine-tune vs. Prompt Engineering vs. RAG

Before touching a single line of training code, answer this honestly:

**Use prompt engineering first.** If you need the model to follow a new instruction style, use few-shot examples in the system prompt. GPT-4o and Claude 3.5 Sonnet can follow complex formats with zero training cost. Prompt engineering costs $0 in infra and takes minutes to iterate.

**Use RAG when the gap is knowledge, not behavior.** If your model hallucinates because it lacks current or domain-specific facts, retrieval-augmented generation (RAG) is the right fix. You inject relevant documents at inference time. No training required, and the knowledge stays up to date.

**Fine-tune when the gap is behavioral.** You need fine-tuning when:
- You want a smaller, cheaper model to match a larger one on a specific task
- You need consistent output format or tone that prompting cannot reliably enforce
- Your task has domain-specific vocabulary (legal, medical, code in an unusual language)
- You want to reduce latency and cost by running a 7B model instead of calling a 70B API
- You need to distill reasoning patterns from a teacher model into a student

The cost hierarchy is clear: prompt engineering < RAG < fine-tuning. Only climb the ladder when the lower rungs cannot carry the load.

---

## 2. LoRA Fundamentals: Math Intuition, Rank, Alpha, Target Modules

LoRA (Low-Rank Adaptation) was introduced by Hu et al. in 2021. The insight is elegant: when you fine-tune a full model, the weight update matrix `ΔW` has a low intrinsic rank. Instead of updating all weights in a layer, decompose `ΔW` into two small matrices:

```
W' = W + ΔW = W + BA
```

Where:
- `W` is the frozen pretrained weight matrix of shape `(d_out, d_in)`
- `B` is a trainable matrix of shape `(d_out, r)`
- `A` is a trainable matrix of shape `(r, d_in)`
- `r` is the rank (typically 4, 8, 16, or 64)

For a weight matrix of shape `(4096, 4096)`, a full fine-tune updates `16.7M` parameters. With `r=8`, LoRA updates only `2 × 4096 × 8 = 65,536` parameters — a 256x reduction.

### Key Hyperparameters

**`r` (rank):** Controls the expressiveness of the adapter. Lower rank = fewer parameters, faster training, less overfitting risk. Start with `r=8` or `r=16`. For complex tasks or large distribution shifts, `r=32` or `r=64`.

**`lora_alpha`:** A scaling factor applied to the LoRA output: `ΔW = (alpha / r) × BA`. Common practice is to set `alpha = 2 × r` (e.g., `alpha=16` with `r=8`). Higher alpha = stronger influence of the adapter over the base model.

**`target_modules`:** Which linear layers to apply LoRA to. For transformer attention, common targets are:
- `q_proj`, `v_proj` (minimum effective set)
- `q_proj`, `k_proj`, `v_proj`, `o_proj` (attention only)
- Add `gate_proj`, `up_proj`, `down_proj` to also cover MLP layers (recommended for LLaMA-family models)

**`lora_dropout`:** Regularization. Set to `0.05` for smaller datasets, `0.0` for large datasets.

### Initialization

`A` is initialized with random Gaussian values, `B` with zeros. This ensures `ΔW = BA = 0` at the start of training — the model starts exactly at the pretrained checkpoint.

---

## 3. QLoRA: Quantization + LoRA

QLoRA (Dettmers et al., 2023) stacks two innovations on top of LoRA to enable fine-tuning of very large models on limited VRAM.

### 4-bit NF4 Quantization

NF4 (Normal Float 4-bit) is a quantization data type designed specifically for normally distributed neural network weights. Unlike standard INT4, NF4 uses quantile-based quantization, meaning each bin in the 4-bit representation covers an equal portion of the normal distribution. This minimizes quantization error for weight distributions that actually appear in transformers.

A 7B model in FP16 requires ~14 GB VRAM. In NF4, it requires ~4-5 GB. A 13B model drops from ~26 GB to ~7-8 GB.

### Double Quantization

QLoRA quantizes not only the weights but also the quantization constants themselves (the scale factors used in dequantization). This "double quantization" saves an additional ~0.37 bits per parameter — roughly 3 GB saved for a 65B model.

### Paged Optimizers

QLoRA uses NVIDIA unified memory to page optimizer states between GPU and CPU RAM when GPU memory is exhausted. This prevents OOM crashes during gradient spikes.

### The Trade-off

QLoRA is slower than full LoRA on FP16 weights because every forward pass requires dequantizing NF4 weights to BF16 before compute. On an A100, QLoRA is approximately 30-40% slower than LoRA with FP16 base weights. On a consumer RTX 4090, QLoRA trains a 13B model where FP16 LoRA would OOM.

---

## 4. Setting Up the Environment

```bash
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cu121
pip install transformers==4.40.0
pip install peft==0.10.0
pip install trl==0.8.6
pip install bitsandbytes==0.43.1
pip install datasets==2.19.0
pip install accelerate==0.29.3
pip install huggingface_hub
```

Verify your CUDA setup:

```python
import torch
print(torch.cuda.is_available())          # True
print(torch.cuda.get_device_name(0))      # e.g., NVIDIA RTX 4090
print(torch.cuda.get_device_properties(0).total_memory / 1e9)  # VRAM in GB
```

### BitsAndBytes Config for QLoRA

```python
from transformers import BitsAndBytesConfig
import torch

bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_use_double_quant=True,
)
```

---

## 5. Dataset Preparation for Fine-tuning

The dataset is where most fine-tuning projects succeed or fail. Model architecture rarely matters as much as data quality.

### Alpaca Format (Instruction Tuning)

The Alpaca format is the de facto standard for single-turn instruction datasets:

```json
{
  "instruction": "Classify the sentiment of the following review.",
  "input": "The product exceeded my expectations in every way.",
  "output": "Positive"
}
```

If there is no additional context, `input` can be an empty string.

### Chat Template Format

For conversational fine-tuning (chat models), use the ChatML or model-specific template:

```python
# ChatML format
messages = [
    {"role": "system", "content": "You are a legal document summarizer."},
    {"role": "user", "content": "Summarize this contract clause: ..."},
    {"role": "assistant", "content": "This clause establishes..."},
]

# Apply the tokenizer's chat template
tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=False)
```

### Building a HuggingFace Dataset

```python
from datasets import Dataset, load_dataset
import json

# Load from JSONL file
def load_jsonl(path):
    with open(path) as f:
        return [json.loads(line) for line in f]

raw_data = load_jsonl("my_data.jsonl")
dataset = Dataset.from_list(raw_data)

# Format into instruction template
def format_alpaca(example):
    if example["input"]:
        text = (
            f"### Instruction:\n{example['instruction']}\n\n"
            f"### Input:\n{example['input']}\n\n"
            f"### Response:\n{example['output']}"
        )
    else:
        text = (
            f"### Instruction:\n{example['instruction']}\n\n"
            f"### Response:\n{example['output']}"
        )
    return {"text": text}

dataset = dataset.map(format_alpaca)

# Train/eval split
dataset = dataset.train_test_split(test_size=0.1, seed=42)
train_dataset = dataset["train"]
eval_dataset = dataset["test"]

print(f"Train: {len(train_dataset)} | Eval: {len(eval_dataset)}")
```

### Data Quality Checklist

- Minimum 500 examples for behavioral fine-tuning; 5,000+ for strong generalization
- Remove duplicates: `dataset.filter(lambda x: len(x["text"]) > 50)`
- Check for prompt-response length balance — avoid examples where output is shorter than input on instruction tasks
- Decontaminate: remove examples that appear in common benchmarks (MMLU, HumanEval)
- For code tasks, run a linter pass to ensure code examples are syntactically valid

---

## 6. Training with SFTTrainer + PEFT Config

This is a complete, runnable training script for QLoRA fine-tuning using TRL's `SFTTrainer`:

```python
import torch
from transformers import (
    AutoModelForCausalLM,
    AutoTokenizer,
    BitsAndBytesConfig,
    TrainingArguments,
)
from peft import LoraConfig, get_peft_model, TaskType, prepare_model_for_kbit_training
from trl import SFTTrainer, SFTConfig
from datasets import load_dataset

# ── Config ──────────────────────────────────────────────────────────────────
MODEL_ID = "meta-llama/Meta-Llama-3-8B-Instruct"
OUTPUT_DIR = "./llama3-finetuned"
MAX_SEQ_LENGTH = 2048

# ── BitsAndBytes (QLoRA) ────────────────────────────────────────────────────
bnb_config = BitsAndBytesConfig(
    load_in_4bit=True,
    bnb_4bit_quant_type="nf4",
    bnb_4bit_compute_dtype=torch.bfloat16,
    bnb_4bit_use_double_quant=True,
)

# ── Load model and tokenizer ─────────────────────────────────────────────────
model = AutoModelForCausalLM.from_pretrained(
    MODEL_ID,
    quantization_config=bnb_config,
    device_map="auto",
    trust_remote_code=True,
)
model = prepare_model_for_kbit_training(model)  # enables gradient checkpointing

tokenizer = AutoTokenizer.from_pretrained(MODEL_ID, trust_remote_code=True)
tokenizer.pad_token = tokenizer.eos_token
tokenizer.padding_side = "right"  # important for SFT

# ── LoRA Config ──────────────────────────────────────────────────────────────
lora_config = LoraConfig(
    r=16,
    lora_alpha=32,
    target_modules=[
        "q_proj", "k_proj", "v_proj", "o_proj",
        "gate_proj", "up_proj", "down_proj",
    ],
    lora_dropout=0.05,
    bias="none",
    task_type=TaskType.CAUSAL_LM,
)

model = get_peft_model(model, lora_config)
model.print_trainable_parameters()
# e.g. trainable params: 41,943,040 || all params: 8,072,552,448 || trainable%: 0.5196

# ── Dataset ──────────────────────────────────────────────────────────────────
dataset = load_dataset("json", data_files={"train": "train.jsonl", "test": "eval.jsonl"})

# ── Training Arguments ───────────────────────────────────────────────────────
training_args = SFTConfig(
    output_dir=OUTPUT_DIR,
    num_train_epochs=3,
    per_device_train_batch_size=2,
    gradient_accumulation_steps=4,      # effective batch = 8
    gradient_checkpointing=True,
    optim="paged_adamw_32bit",          # paged optimizer for QLoRA
    logging_steps=25,
    save_strategy="epoch",
    learning_rate=2e-4,
    fp16=False,
    bf16=True,                          # BF16 is preferred on Ampere+ GPUs
    max_grad_norm=0.3,
    warmup_ratio=0.03,
    lr_scheduler_type="cosine",
    report_to="tensorboard",
    max_seq_length=MAX_SEQ_LENGTH,
    dataset_text_field="text",
    packing=False,                      # set True for short sequences to pack
)

# ── Trainer ──────────────────────────────────────────────────────────────────
trainer = SFTTrainer(
    model=model,
    train_dataset=dataset["train"],
    eval_dataset=dataset["test"],
    tokenizer=tokenizer,
    args=training_args,
)

trainer.train()
trainer.save_model(OUTPUT_DIR)
```

### Key Hyperparameter Notes

- **`learning_rate=2e-4`**: Standard starting point for LoRA. Full fine-tunes use `1e-5` to `5e-5`. LoRA adapters tolerate higher LRs because only a small fraction of parameters change.
- **`gradient_accumulation_steps=4`**: Accumulates gradients over 4 steps before an optimizer update. Emulates a larger batch size without extra VRAM.
- **`packing=True`**: Concatenates short training examples into sequences up to `max_seq_length`, maximizing GPU utilization. Only use if examples are consistently shorter than `max_seq_length`.
- **`optim="paged_adamw_32bit"`**: Required for QLoRA. Pages optimizer states to CPU RAM when GPU is under pressure.

---

## 7. Unsloth: 2x Faster Fine-tuning

[Unsloth](https://github.com/unslothai/unsloth) rewrites the attention kernels and PEFT layers in Triton/CUDA to achieve 2x throughput and 60% less VRAM compared to standard HuggingFace + PEFT training. The API is nearly identical:

```bash
pip install "unsloth[colab-new] @ git+https://github.com/unslothai/unsloth.git"
```

```python
from unsloth import FastLanguageModel
import torch

MAX_SEQ_LENGTH = 2048

# Load model with Unsloth (handles quantization automatically)
model, tokenizer = FastLanguageModel.from_pretrained(
    model_name="unsloth/Meta-Llama-3-8B-Instruct-bnb-4bit",
    max_seq_length=MAX_SEQ_LENGTH,
    dtype=None,           # auto-detect: BF16 on Ampere+, FP16 otherwise
    load_in_4bit=True,
)

# Apply LoRA via Unsloth's optimized get_peft_model
model = FastLanguageModel.get_peft_model(
    model,
    r=16,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj",
                    "gate_proj", "up_proj", "down_proj"],
    lora_alpha=32,
    lora_dropout=0.0,     # Unsloth recommends 0 for speed
    bias="none",
    use_gradient_checkpointing="unsloth",  # Unsloth's optimized checkpointing
    random_state=42,
    use_rslora=False,
)

# The rest of the training loop is identical to the PEFT example above
# SFTTrainer works with Unsloth models without modification
```

Unsloth also provides pre-quantized 4-bit models on the Hugging Face Hub (`unsloth/` prefix) that are tested and ready to use. Benchmarks on an RTX 4090 show:
- Standard PEFT QLoRA: ~1,200 tokens/second
- Unsloth QLoRA: ~2,400 tokens/second
- Unsloth FP16 LoRA: ~3,100 tokens/second

For production training runs on large datasets, Unsloth is worth the additional dependency.

---

## 8. Evaluation: Perplexity, ROUGE, Task-Specific Benchmarks

Training loss is a proxy metric. Always evaluate on the actual task.

### Perplexity

Perplexity measures how surprised the model is by held-out text. Lower is better. Evaluate on a held-out validation set from your domain:

```python
import torch
from transformers import AutoModelForCausalLM, AutoTokenizer

def compute_perplexity(model, tokenizer, texts, max_length=512):
    model.eval()
    total_loss = 0
    total_tokens = 0

    with torch.no_grad():
        for text in texts:
            inputs = tokenizer(
                text, return_tensors="pt", truncation=True,
                max_length=max_length
            ).to(model.device)
            outputs = model(**inputs, labels=inputs["input_ids"])
            loss = outputs.loss
            n_tokens = inputs["input_ids"].shape[1]
            total_loss += loss.item() * n_tokens
            total_tokens += n_tokens

    avg_loss = total_loss / total_tokens
    return torch.exp(torch.tensor(avg_loss)).item()
```

### ROUGE for Summarization

```python
from rouge_score import rouge_scorer

scorer = rouge_scorer.RougeScorer(["rouge1", "rouge2", "rougeL"], use_stemmer=True)

def evaluate_rouge(predictions, references):
    scores = {"rouge1": [], "rouge2": [], "rougeL": []}
    for pred, ref in zip(predictions, references):
        result = scorer.score(ref, pred)
        for key in scores:
            scores[key].append(result[key].fmeasure)
    return {k: sum(v) / len(v) for k, v in scores.items()}
```

### Task-Specific Evaluation

For classification tasks, use accuracy and F1. For code generation, use `pass@k` (the probability that at least one of `k` generated solutions passes the test suite). For open-ended generation, consider LLM-as-judge evaluation:

```python
# Simple LLM-as-judge using your trained model or an external API
def llm_judge(question, response, rubric, judge_model):
    prompt = f"""Rate the following response on a scale of 1-5.

Question: {question}
Response: {response}
Rubric: {rubric}

Provide only a single integer score."""
    # call judge_model here
    pass
```

### Running lm-evaluation-harness

For standardized benchmarks (MMLU, ARC, HellaSwag):

```bash
pip install lm-eval
lm_eval --model hf \
    --model_args pretrained=./llama3-finetuned,peft=./llama3-finetuned \
    --tasks mmlu,arc_easy \
    --device cuda:0 \
    --batch_size 8
```

---

## 9. Merging and Exporting the Adapter

After training, you have two options: keep the adapter separate (load base model + adapter at inference) or merge the adapter weights permanently into the base model.

### Merge and Save (for deployment)

```python
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer
import torch

base_model = AutoModelForCausalLM.from_pretrained(
    "meta-llama/Meta-Llama-3-8B-Instruct",
    torch_dtype=torch.bfloat16,
    device_map="auto",
)
tokenizer = AutoTokenizer.from_pretrained("meta-llama/Meta-Llama-3-8B-Instruct")

# Load and merge the LoRA adapter
model = PeftModel.from_pretrained(base_model, "./llama3-finetuned")
model = model.merge_and_unload()   # merges BA into W, removes adapter layers

# Save the merged model
model.save_pretrained("./llama3-merged")
tokenizer.save_pretrained("./llama3-merged")
print("Merged model saved.")
```

### Export to GGUF for Ollama

GGUF is the quantization format used by llama.cpp and Ollama, enabling CPU inference on commodity hardware:

```bash
git clone https://github.com/ggerganov/llama.cpp
cd llama.cpp
pip install -r requirements.txt

# Convert merged HF model to GGUF
python convert_hf_to_gguf.py ../llama3-merged --outtype bf16 --outfile llama3-custom.bf16.gguf

# Quantize to Q4_K_M (4-bit, good quality/size balance)
./llama-quantize llama3-custom.bf16.gguf llama3-custom.Q4_K_M.gguf Q4_K_M
```

Create a Modelfile and load into Ollama:

```
FROM ./llama3-custom.Q4_K_M.gguf
SYSTEM "You are a specialized assistant for legal document analysis."
PARAMETER temperature 0.1
PARAMETER num_ctx 4096
```

```bash
ollama create my-llama3 -f Modelfile
ollama run my-llama3
```

---

## 10. Deployment Options

### vLLM (High-throughput API server)

vLLM is the production standard for serving LLMs at scale. It uses PagedAttention for efficient KV cache management, achieving 3-24x higher throughput than naive HuggingFace inference.

```bash
pip install vllm

# Serve the merged model
python -m vllm.entrypoints.openai.api_server \
    --model ./llama3-merged \
    --port 8000 \
    --tensor-parallel-size 1 \
    --max-model-len 4096 \
    --quantization awq   # or bitsandbytes for dynamic quantization
```

vLLM exposes an OpenAI-compatible API, so any OpenAI SDK client works without changes:

```python
from openai import OpenAI

client = OpenAI(base_url="http://localhost:8000/v1", api_key="not-needed")
response = client.chat.completions.create(
    model="llama3-merged",
    messages=[{"role": "user", "content": "Summarize this contract..."}],
    max_tokens=512,
)
print(response.choices[0].message.content)
```

### Ollama (Local / Edge)

After the GGUF export above, Ollama provides a local REST API suitable for developer tools, desktop apps, and privacy-sensitive use cases.

### Hugging Face Inference Endpoints

For managed cloud deployment without ops overhead:

```python
from huggingface_hub import HfApi

api = HfApi()
# Push merged model to your HF repo
api.upload_folder(
    folder_path="./llama3-merged",
    repo_id="your-username/llama3-custom",
    repo_type="model",
)
# Then create an Inference Endpoint through the HF UI or API
```

---

## 11. Key Decisions and Troubleshooting

### Decision Tree

| Situation | Recommendation |
|-----------|----------------|
| Limited VRAM (< 16 GB) | QLoRA with 4-bit NF4, `r=8` |
| 24 GB VRAM (e.g., 3090/4090) | FP16 LoRA, `r=16`, Unsloth |
| Multi-GPU training | Full LoRA with DeepSpeed ZeRO-3 |
| < 1,000 training examples | Lower `r=4`, higher dropout, fewer epochs |
| Production throughput matters | Merge adapter → vLLM |
| Privacy / offline required | Merge adapter → GGUF → Ollama |

### Common Errors and Fixes

**`RuntimeError: CUDA out of memory`**
- Reduce `per_device_train_batch_size` to 1
- Increase `gradient_accumulation_steps` to compensate
- Enable `gradient_checkpointing=True`
- Reduce `max_seq_length`
- Switch from FP16 LoRA to QLoRA (4-bit)

**`The model outputs NaN loss after a few steps`**
- Your learning rate is too high. Start at `1e-4` and reduce if unstable.
- Check for empty or malformed training examples (empty output fields)
- Ensure `tokenizer.pad_token` is set

**`Training loss not decreasing below baseline`**
- The model may already handle this distribution well — check if fine-tuning is actually needed
- The dataset may have low signal; audit 20 random examples manually
- Increase `r` and `lora_alpha` proportionally

**`Inference after merging is slower than the base model`**
- Merging should be lossless in speed. Verify `model.merge_and_unload()` was called before saving.
- Check that you're not loading the base model + adapter at inference (2x weight load)

**Catastrophic forgetting on general tasks**
- Add a small proportion (5-10%) of general instruction-following data to your training set
- Reduce the number of training epochs (1-2 epochs often sufficient for behavioral fine-tuning)
- Use a lower learning rate

### Evaluating Whether Fine-tuning Worked

The minimum bar: does your fine-tuned model outperform the base model on a held-out test set from your domain, without significantly degrading performance on a general benchmark?

Run both evaluations before merging and shipping:

```bash
# Task-specific
python evaluate.py --model ./llama3-finetuned --dataset test_domain.jsonl

# General capability (check for regression)
lm_eval --model hf --model_args pretrained=./llama3-finetuned \
    --tasks arc_easy,hellaswag --device cuda:0
```

If the fine-tuned model wins on the domain task and does not regress more than 2-3 points on general benchmarks, you have a successful fine-tune. Ship it.

---

## Summary

Fine-tuning LLMs in 2026 is accessible, not arcane. The practical path for most projects:

1. Start with QLoRA on a 7B or 8B model (LLaMA 3, Mistral, Phi-3)
2. Use Unsloth for 2x training speed with zero code changes
3. Keep `r=16`, `alpha=32` as your default LoRA config
4. Invest 80% of your effort in dataset quality — it determines results more than any hyperparameter
5. Evaluate on your actual task metric, not just training loss
6. Merge and export to GGUF for cost-effective deployment

The frameworks (PEFT, TRL, Unsloth) are stable and well-documented. The bottleneck is data. Build a clean, domain-specific dataset and the training will follow.
