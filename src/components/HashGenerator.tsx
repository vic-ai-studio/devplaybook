import { useState, useEffect } from 'preact/hooks';

type Algorithm = 'SHA-256' | 'SHA-512' | 'SHA-1' | 'MD5';

// Pure-JS MD5 (no external deps)
function md5(str: string): string {
  function safeAdd(x: number, y: number) {
    const lsw = (x & 0xffff) + (y & 0xffff);
    return ((x >> 16) + (y >> 16) + (lsw >> 16)) << 16 | lsw & 0xffff;
  }
  function bitRotLeft(num: number, cnt: number) { return num << cnt | num >>> (32 - cnt); }
  function cmn(q: number, a: number, b: number, x: number, s: number, t: number) {
    return safeAdd(bitRotLeft(safeAdd(safeAdd(a, q), safeAdd(x, t)), s), b);
  }
  function ff(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn(b & c | ~b & d, a, b, x, s, t); }
  function gg(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn(b & d | c & ~d, a, b, x, s, t); }
  function hh(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn(b ^ c ^ d, a, b, x, s, t); }
  function ii(a: number, b: number, c: number, d: number, x: number, s: number, t: number) { return cmn(c ^ (b | ~d), a, b, x, s, t); }

  const x = str2binl(str);
  x[str.length >> 2] |= 0x80 << (str.length % 4 * 8);
  x[(((str.length + 64) >> 9) << 4) + 14] = str.length * 8;

  let a = 1732584193, b = -271733879, c = -1732584194, d = 271733878;
  for (let i = 0; i < x.length; i += 16) {
    const [oa, ob, oc, od] = [a, b, c, d];
    a = ff(a,b,c,d,x[i],7,-680876936); d = ff(d,a,b,c,x[i+1],12,-389564586); c = ff(c,d,a,b,x[i+2],17,606105819); b = ff(b,c,d,a,x[i+3],22,-1044525330);
    a = ff(a,b,c,d,x[i+4],7,-176418897); d = ff(d,a,b,c,x[i+5],12,1200080426); c = ff(c,d,a,b,x[i+6],17,-1473231341); b = ff(b,c,d,a,x[i+7],22,-45705983);
    a = ff(a,b,c,d,x[i+8],7,1770035416); d = ff(d,a,b,c,x[i+9],12,-1958414417); c = ff(c,d,a,b,x[i+10],17,-42063); b = ff(b,c,d,a,x[i+11],22,-1990404162);
    a = ff(a,b,c,d,x[i+12],7,1804603682); d = ff(d,a,b,c,x[i+13],12,-40341101); c = ff(c,d,a,b,x[i+14],17,-1502002290); b = ff(b,c,d,a,x[i+15],22,1236535329);
    a = gg(a,b,c,d,x[i+1],5,-165796510); d = gg(d,a,b,c,x[i+6],9,-1069501632); c = gg(c,d,a,b,x[i+11],14,643717713); b = gg(b,c,d,a,x[i],20,-373897302);
    a = gg(a,b,c,d,x[i+5],5,-701558691); d = gg(d,a,b,c,x[i+10],9,38016083); c = gg(c,d,a,b,x[i+15],14,-660478335); b = gg(b,c,d,a,x[i+4],20,-405537848);
    a = gg(a,b,c,d,x[i+9],5,568446438); d = gg(d,a,b,c,x[i+14],9,-1019803690); c = gg(c,d,a,b,x[i+3],14,-187363961); b = gg(b,c,d,a,x[i+8],20,1163531501);
    a = gg(a,b,c,d,x[i+13],5,-1444681467); d = gg(d,a,b,c,x[i+2],9,-51403784); c = gg(c,d,a,b,x[i+7],14,1735328473); b = gg(b,c,d,a,x[i+12],20,-1926607734);
    a = hh(a,b,c,d,x[i+5],4,-378558); d = hh(d,a,b,c,x[i+8],11,-2022574463); c = hh(c,d,a,b,x[i+11],16,1839030562); b = hh(b,c,d,a,x[i+14],23,-35309556);
    a = hh(a,b,c,d,x[i+1],4,-1530992060); d = hh(d,a,b,c,x[i+4],11,1272893353); c = hh(c,d,a,b,x[i+7],16,-155497632); b = hh(b,c,d,a,x[i+10],23,-1094730640);
    a = hh(a,b,c,d,x[i+13],4,681279174); d = hh(d,a,b,c,x[i],11,-358537222); c = hh(c,d,a,b,x[i+3],16,-722521979); b = hh(b,c,d,a,x[i+6],23,76029189);
    a = hh(a,b,c,d,x[i+9],4,-640364487); d = hh(d,a,b,c,x[i+12],11,-421815835); c = hh(c,d,a,b,x[i+15],16,530742520); b = hh(b,c,d,a,x[i+2],23,-995338651);
    a = ii(a,b,c,d,x[i],6,-198630844); d = ii(d,a,b,c,x[i+7],10,1126891415); c = ii(c,d,a,b,x[i+14],15,-1416354905); b = ii(b,c,d,a,x[i+5],21,-57434055);
    a = ii(a,b,c,d,x[i+12],6,1700485571); d = ii(d,a,b,c,x[i+3],10,-1894986606); c = ii(c,d,a,b,x[i+10],15,-1051523); b = ii(b,c,d,a,x[i+1],21,-2054922799);
    a = ii(a,b,c,d,x[i+8],6,1873313359); d = ii(d,a,b,c,x[i+15],10,-30611744); c = ii(c,d,a,b,x[i+6],15,-1560198380); b = ii(b,c,d,a,x[i+13],21,1309151649);
    a = ii(a,b,c,d,x[i+4],6,-145523070); d = ii(d,a,b,c,x[i+11],10,-1120210379); c = ii(c,d,a,b,x[i+2],15,718787259); b = ii(b,c,d,a,x[i+9],21,-343485551);
    a = safeAdd(a, oa); b = safeAdd(b, ob); c = safeAdd(c, oc); d = safeAdd(d, od);
  }
  return binl2hex([a, b, c, d]);

  function str2binl(str: string) {
    const bin: number[] = [];
    const mask = (1 << 8) - 1;
    for (let i = 0; i < str.length * 8; i += 8) bin[i >> 5] |= (str.charCodeAt(i / 8) & mask) << (i % 32);
    return bin;
  }
  function binl2hex(binarray: number[]) {
    const hexTab = '0123456789abcdef';
    let str = '';
    for (let i = 0; i < binarray.length * 4; i++) {
      str += hexTab.charAt((binarray[i >> 2] >> ((i % 4) * 8 + 4)) & 0xf) + hexTab.charAt((binarray[i >> 2] >> ((i % 4) * 8)) & 0xf);
    }
    return str;
  }
}

async function hashText(text: string, algo: Algorithm): Promise<string> {
  if (algo === 'MD5') return md5(text);
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest(algo, data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

const ALGORITHMS: Algorithm[] = ['MD5', 'SHA-1', 'SHA-256', 'SHA-512'];

export default function HashGenerator() {
  const [input, setInput] = useState('');
  const [hashes, setHashes] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!input) { setHashes({}); return; }
    setLoading(true);
    Promise.all(
      ALGORITHMS.map(algo => hashText(input, algo).then(h => [algo, h] as [string, string]))
    ).then(results => {
      setHashes(Object.fromEntries(results));
      setLoading(false);
    });
  }, [input]);

  const copy = (algo: string) => {
    navigator.clipboard.writeText(hashes[algo]).then(() => {
      setCopied(algo);
      setTimeout(() => setCopied(null), 1500);
    });
  };

  return (
    <div class="space-y-4">
      <div>
        <label class="block text-sm font-medium text-text-muted mb-2">Input text</label>
        <textarea
          class="w-full h-32 bg-bg-card border border-border rounded-lg p-3 font-mono text-sm text-text resize-none focus:outline-none focus:border-primary transition-colors"
          placeholder="Enter text to hash..."
          value={input}
          onInput={(e) => setInput((e.target as HTMLTextAreaElement).value)}
        />
        <div class="flex justify-between mt-1">
          <span class="text-xs text-text-muted">{input.length} characters</span>
          <button onClick={() => setInput('')} class="text-xs text-text-muted hover:text-primary transition-colors">Clear</button>
        </div>
      </div>

      {loading && <p class="text-sm text-text-muted">Computing hashes...</p>}

      {Object.keys(hashes).length > 0 && (
        <div class="space-y-3">
          {ALGORITHMS.map(algo => (
            <div key={algo} class="bg-bg-card border border-border rounded-lg p-4">
              <div class="flex justify-between items-center mb-2">
                <span class="text-xs font-semibold text-primary uppercase tracking-wide">{algo}</span>
                <button
                  onClick={() => copy(algo)}
                  class="text-xs bg-bg border border-border px-2.5 py-1 rounded hover:border-primary hover:text-primary transition-colors"
                >
                  {copied === algo ? '✓ Copied' : 'Copy'}
                </button>
              </div>
              <code class="text-xs font-mono text-text break-all">{hashes[algo]}</code>
            </div>
          ))}
        </div>
      )}

      {!input && (
        <p class="text-sm text-text-muted text-center py-4">
          Type something above to generate MD5, SHA-1, SHA-256, and SHA-512 hashes instantly.
          <br /><span class="text-xs">All hashing runs in your browser — nothing is sent to any server.</span>
        </p>
      )}
    </div>
  );
}
