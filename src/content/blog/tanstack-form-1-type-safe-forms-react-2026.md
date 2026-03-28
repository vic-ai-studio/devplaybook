---
title: "TanStack Form 1.0: Type-Safe Forms in React 2026"
description: "TanStack Form 1.0 brings headless, type-safe, framework-agnostic form management to React. Compare with react-hook-form and Formik, with Zod validation examples."
pubDate: 2026-03-28
tags: ["tanstack-form", "react", "forms", "typescript", "zod"]
---

Forms are one of the most common and most painful parts of building web applications. For years, the React ecosystem cycled through Formik and react-hook-form as the dominant solutions. Both solve real problems. Both also carry real limitations that become visible as your forms grow in complexity or your TypeScript strictness increases. TanStack Form 1.0 is a ground-up rethink of what a form library should be in 2026.

This article walks through everything that matters: why the library was built, how its core abstractions work, TypeScript integration, validation patterns, performance characteristics, and a full real-world example.

## Why TanStack Form Exists

### Formik's Problems

Formik was a breakthrough when it launched. It gave React developers a controlled component model for forms with a clean API for touched, errors, and submission state. The problem is the execution model: Formik re-renders the entire form on every keystroke by default. For small forms this is invisible. For a 30-field form with complex conditional rendering, it becomes a real performance issue. Formik also predates modern TypeScript patterns — its types are workable but not fully inferred from your schema. You end up writing redundant type annotations.

Formik's maintenance has also slowed considerably. It has not meaningfully adapted to the React 18 concurrent model.

### react-hook-form's Problems

react-hook-form (RHF) solved the re-render problem by using uncontrolled inputs and refs rather than state. This is genuinely smart. An RHF form does not re-render on every keystroke because it is not storing values in React state — it reads them from the DOM via refs at submission time or on explicit triggers.

The limitation shows up when you need field-level reactivity. If field B needs to respond to field A's value in real time, RHF requires `watch()`, which re-introduces re-renders for the watched values. The `useWatch` hook and the `Controller` component add boilerplate. The `Controller` abstraction also means you are wrapping every third-party input component in a wrapper, which creates friction.

RHF's TypeScript support improved dramatically with v7 and v8, but it still relies on string-based field paths (`register("user.address.street")`), which are type-checked but lose autocomplete ergonomics in complex nested schemas.

### What TanStack Form Does Differently

TanStack Form was built by Tanner Linsley (creator of TanStack Query, TanStack Table) with three principles:

1. **Headless**: no built-in UI, no assumptions about your component library
2. **Framework-agnostic core**: the same `@tanstack/form-core` package works in React, Vue, Solid, Angular, and Svelte
3. **Field-level reactivity without global re-renders**: each field subscribes only to its own state

The result is a library where changing the value of one field does not cause any other field to re-render, unless that field explicitly subscribes to the changed value.

## Core Concepts

### Creating a Form

```tsx
import { useForm } from "@tanstack/react-form";

function RegistrationForm() {
  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
      age: 0,
    },
    onSubmit: async ({ value }) => {
      await registerUser(value);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        form.handleSubmit();
      }}
    >
      {/* fields go here */}
    </form>
  );
}
```

`useForm` returns a `form` instance. The `defaultValues` object is the single source of truth for your form's shape. TypeScript infers the entire form type from this object — no separate type annotation needed.

### Defining Fields

Fields are defined using `form.Field`, a render-prop component:

```tsx
<form.Field name="email">
  {(field) => (
    <div>
      <label htmlFor={field.name}>Email</label>
      <input
        id={field.name}
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
      />
      {field.state.meta.errors.length > 0 && (
        <span>{field.state.meta.errors.join(", ")}</span>
      )}
    </div>
  )}
</form.Field>
```

The `name` prop is fully type-safe. If your form shape does not have an `email` field, TypeScript will error. The `field` object gives you `state.value`, `state.meta` (touched, dirty, errors, isValidating), `handleChange`, and `handleBlur`.

### Field-Level Reactivity

The key design insight is that each `form.Field` renders its own subscription. When `email` changes, only the `email` field's render function re-runs. The `password` field component does not re-render at all. This is not magic — it is a subscription model where each field registers itself with the form store and receives updates only for its own slice.

Compare this to a Formik form where `setFieldValue("email", val)` triggers a full form re-render, or an RHF form where `watch("email")` causes re-renders in whatever component calls it.

## TypeScript Integration

TanStack Form's TypeScript support is genuinely first-class. The form type is inferred from `defaultValues`, and every API surface is typed accordingly.

```tsx
const form = useForm({
  defaultValues: {
    user: {
      name: "",
      address: {
        street: "",
        city: "",
        zip: "",
      },
    },
    tags: [] as string[],
  },
  onSubmit: async ({ value }) => {
    // value is fully typed:
    // { user: { name: string; address: { street: string; city: string; zip: string } }; tags: string[] }
    console.log(value.user.address.city); // autocomplete works
  },
});
```

Nested field paths use dot notation and are fully type-checked:

```tsx
<form.Field name="user.address.city">
  {(field) => (
    <input
      value={field.state.value} // typed as string
      onChange={(e) => field.handleChange(e.target.value)}
    />
  )}
</form.Field>
```

If you write `name="user.address.postcode"` and that key does not exist in your schema, TypeScript throws a compile error. This catches bugs that RHF's string-based paths miss at the type level.

## Validation with Zod

TanStack Form has a first-party adapter for Zod via `@tanstack/zod-form-adapter`. Validation can be applied at the field level or the form level.

### Field-Level Zod Validation

```tsx
import { zodValidator } from "@tanstack/zod-form-adapter";
import { z } from "zod";

<form.Field
  name="email"
  validatorAdapter={zodValidator()}
  validators={{
    onChange: z.string().email("Must be a valid email address"),
    onBlur: z.string().min(1, "Email is required"),
  }}
>
  {(field) => (
    <div>
      <input
        value={field.state.value}
        onBlur={field.handleBlur}
        onChange={(e) => field.handleChange(e.target.value)}
      />
      {field.state.meta.isTouched && field.state.meta.errors.length > 0 && (
        <p className="error">{field.state.meta.errors[0]}</p>
      )}
    </div>
  )}
</form.Field>
```

The `validators` object accepts different trigger keys: `onChange`, `onBlur`, `onSubmit`, and `onMount`. This lets you apply different validation rules at different interaction points — a common UX pattern where you validate on blur but show errors on submit.

### Form-Level Zod Validation

For cross-field validation (password confirmation, date ranges), apply a schema at the form level:

```tsx
const schema = z
  .object({
    password: z.string().min(8),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

const form = useForm({
  defaultValues: { password: "", confirmPassword: "" },
  validatorAdapter: zodValidator(),
  validators: {
    onSubmit: schema,
  },
  onSubmit: async ({ value }) => { /* ... */ },
});
```

### Valibot Support

Valibot is an alternative schema library with a smaller bundle size. TanStack Form supports it identically via `@tanstack/valibot-form-adapter`:

```tsx
import { valibotValidator } from "@tanstack/valibot-form-adapter";
import * as v from "valibot";

<form.Field
  name="username"
  validatorAdapter={valibotValidator()}
  validators={{
    onChange: v.pipe(
      v.string(),
      v.minLength(3, "Username must be at least 3 characters"),
      v.maxLength(20, "Username cannot exceed 20 characters"),
      v.regex(/^[a-z0-9_]+$/, "Only lowercase letters, numbers, and underscores")
    ),
  }}
>
  {(field) => <input value={field.state.value} onChange={(e) => field.handleChange(e.target.value)} />}
</form.Field>
```

## Async Validation

Async validation is where TanStack Form really differentiates itself. The username availability check is the canonical example:

```tsx
<form.Field
  name="username"
  validatorAdapter={zodValidator()}
  validators={{
    onChange: z.string().min(3),
    onChangeAsync: z.string().refine(
      async (value) => {
        if (value.length < 3) return true; // let sync validator handle this
        const res = await fetch(`/api/check-username?username=${value}`);
        const { available } = await res.json();
        return available;
      },
      { message: "Username is already taken" }
    ),
    onChangeAsyncDebounceMs: 500, // debounce async calls by 500ms
  }}
>
  {(field) => (
    <div>
      <input
        value={field.state.value}
        onChange={(e) => field.handleChange(e.target.value)}
      />
      {field.state.meta.isValidating && <span>Checking availability...</span>}
      {field.state.meta.errors.length > 0 && (
        <span className="error">{field.state.meta.errors[0]}</span>
      )}
    </div>
  )}
</form.Field>
```

The `onChangeAsyncDebounceMs` option is built in — no need to manually implement debouncing with `useEffect` and `setTimeout`. The `isValidating` flag in `field.state.meta` lets you show a loading indicator while the async check is in flight. Async validation runs after sync validation passes, so you never make a network request for a value that is already invalid locally.

## Array Fields and Nested Forms

Repeating field groups (like adding multiple addresses or line items) use `form.Field` with array indices:

```tsx
const form = useForm({
  defaultValues: {
    skills: [{ name: "", level: "beginner" as "beginner" | "intermediate" | "expert" }],
  },
  onSubmit: async ({ value }) => { /* ... */ },
});

function SkillsForm() {
  return (
    <form.Field name="skills" mode="array">
      {(skillsField) => (
        <div>
          {skillsField.state.value.map((_, i) => (
            <div key={i}>
              <form.Field name={`skills[${i}].name`}>
                {(nameField) => (
                  <input
                    value={nameField.state.value}
                    onChange={(e) => nameField.handleChange(e.target.value)}
                    placeholder="Skill name"
                  />
                )}
              </form.Field>
              <form.Field name={`skills[${i}].level`}>
                {(levelField) => (
                  <select
                    value={levelField.state.value}
                    onChange={(e) =>
                      levelField.handleChange(
                        e.target.value as "beginner" | "intermediate" | "expert"
                      )
                    }
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="expert">Expert</option>
                  </select>
                )}
              </form.Field>
              <button
                type="button"
                onClick={() => skillsField.removeValue(i)}
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() =>
              skillsField.pushValue({ name: "", level: "beginner" })
            }
          >
            Add Skill
          </button>
        </div>
      )}
    </form.Field>
  );
}
```

Array operations (`pushValue`, `removeValue`, `swapValues`, `moveValue`) are methods on the array field instance. Each operation updates the form state and causes only the affected array field components to re-render.

## Performance: No Re-Renders by Default

The performance model deserves careful explanation because it is different from what most React developers are used to.

In a React state-based form (including Formik), every value change flows through `setState`, which schedules a re-render of the component tree from the component that holds the state down. Even with `React.memo`, children that receive stable-reference props will skip re-renders, but the form container and any component using the form state will re-render.

TanStack Form stores its state outside React in an observable store (similar to how Jotai or Zustand work). The `form.Field` component subscribes to a slice of that store — specifically, the slice corresponding to its `name`. When `email` changes:

1. The store updates
2. The `email` Field's subscriber fires
3. Only the `email` Field's render function re-runs
4. No other component re-renders

This means a 50-field form has the same re-render characteristics as a 5-field form for any single keypress. The performance difference becomes significant in forms with expensive child components, animated fields, or complex conditional rendering.

The tradeoff: if you need component A to react to field B's value, you need explicit subscriptions. The `form.useField` hook or `form.useStore` selector pattern handles this:

```tsx
// Subscribe to a computed value across multiple fields
const isFormDirty = form.useStore((state) => state.isDirty);
const emailValue = form.useStore((state) => state.values.email);
```

## Comparison Table

| Feature | TanStack Form 1.0 | react-hook-form v8 | Formik 2.x |
|---|---|---|---|
| Bundle size (gzipped) | ~12kb | ~9kb | ~13kb |
| Re-renders on input | Field only | None (uncontrolled) | Full form |
| TypeScript inference | Full, from defaultValues | Good, string paths | Partial |
| Framework agnostic | Yes | No (React only) | No (React only) |
| Async validation | Built-in + debounce | Manual with `validate` | Manual with `validate` |
| Array fields | Built-in `mode="array"` | `useFieldArray` hook | `FieldArray` component |
| Zod integration | First-party adapter | Third-party resolvers | Third-party resolvers |
| Valibot integration | First-party adapter | Via resolver | Not supported |
| Cross-field validation | Form-level schema | Form-level schema | `validate` function |
| Maintenance status | Active (TanStack team) | Active | Slow |
| React 19 compatible | Yes | Yes | Partial |
| Headless | Yes | Yes | Yes |
| DevTools | In development | Browser extension | None |

## Real-World Example: Multi-Step Registration Form

Here is a complete multi-step registration form combining everything covered above:

```tsx
import { useForm } from "@tanstack/react-form";
import { zodValidator } from "@tanstack/zod-form-adapter";
import { z } from "zod";
import { useState } from "react";

const step1Schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(8, "Password must be at least 8 characters"),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords must match",
  path: ["confirmPassword"],
});

const step2Schema = z.object({
  firstName: z.string().min(1, "Required"),
  lastName: z.string().min(1, "Required"),
  username: z.string().min(3).max(20).regex(/^[a-z0-9_]+$/),
});

export function RegistrationForm() {
  const [step, setStep] = useState(1);

  const form = useForm({
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      firstName: "",
      lastName: "",
      username: "",
      bio: "",
      skills: [{ name: "", level: "beginner" as const }],
    },
    validatorAdapter: zodValidator(),
    onSubmit: async ({ value }) => {
      const { confirmPassword, ...payload } = value;
      await fetch("/api/register", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (step < 3) {
          setStep(step + 1);
        } else {
          form.handleSubmit();
        }
      }}
    >
      {/* Step indicator */}
      <div className="steps">
        {[1, 2, 3].map((s) => (
          <div key={s} className={s === step ? "active" : s < step ? "done" : ""}>
            Step {s}
          </div>
        ))}
      </div>

      {/* Step 1: Account credentials */}
      {step === 1 && (
        <fieldset>
          <legend>Create your account</legend>

          <form.Field
            name="email"
            validators={{
              onChange: z.string().email("Invalid email address"),
              onChangeAsync: z.string().refine(
                async (email) => {
                  if (!email.includes("@")) return true;
                  const res = await fetch(`/api/check-email?email=${email}`);
                  const { available } = await res.json();
                  return available;
                },
                { message: "Email already registered" }
              ),
              onChangeAsyncDebounceMs: 600,
            }}
          >
            {(field) => (
              <div className="field">
                <label>Email</label>
                <input
                  type="email"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.isValidating && <span>Checking...</span>}
                {field.state.meta.isTouched &&
                  field.state.meta.errors.map((err) => (
                    <p key={err} className="error">{err}</p>
                  ))}
              </div>
            )}
          </form.Field>

          <form.Field
            name="password"
            validators={{ onChange: z.string().min(8, "At least 8 characters") }}
          >
            {(field) => (
              <div className="field">
                <label>Password</label>
                <input
                  type="password"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.isTouched &&
                  field.state.meta.errors.map((err) => (
                    <p key={err} className="error">{err}</p>
                  ))}
              </div>
            )}
          </form.Field>

          <form.Field name="confirmPassword">
            {(field) => (
              <div className="field">
                <label>Confirm Password</label>
                <input
                  type="password"
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
              </div>
            )}
          </form.Field>
        </fieldset>
      )}

      {/* Step 2: Profile information */}
      {step === 2 && (
        <fieldset>
          <legend>Your profile</legend>

          <form.Field
            name="username"
            validators={{
              onChange: z.string().min(3).max(20).regex(/^[a-z0-9_]+$/, "Lowercase, numbers, underscores only"),
              onChangeAsync: z.string().refine(
                async (username) => {
                  if (username.length < 3) return true;
                  const res = await fetch(`/api/check-username?username=${username}`);
                  const { available } = await res.json();
                  return available;
                },
                { message: "Username taken" }
              ),
              onChangeAsyncDebounceMs: 500,
            }}
          >
            {(field) => (
              <div className="field">
                <label>Username</label>
                <input
                  value={field.state.value}
                  onBlur={field.handleBlur}
                  onChange={(e) => field.handleChange(e.target.value)}
                />
                {field.state.meta.isValidating && <span>Checking availability...</span>}
                {field.state.meta.isTouched &&
                  field.state.meta.errors.map((err) => (
                    <p key={err} className="error">{err}</p>
                  ))}
              </div>
            )}
          </form.Field>

          <form.Field name="bio">
            {(field) => (
              <div className="field">
                <label>Bio (optional)</label>
                <textarea
                  value={field.state.value}
                  onChange={(e) => field.handleChange(e.target.value)}
                  rows={4}
                />
              </div>
            )}
          </form.Field>
        </fieldset>
      )}

      {/* Step 3: Skills */}
      {step === 3 && (
        <fieldset>
          <legend>Your skills</legend>
          <form.Field name="skills" mode="array">
            {(skillsField) => (
              <div>
                {skillsField.state.value.map((_, i) => (
                  <div key={i} className="skill-row">
                    <form.Field
                      name={`skills[${i}].name`}
                      validators={{
                        onChange: z.string().min(1, "Skill name required"),
                      }}
                    >
                      {(nameField) => (
                        <input
                          value={nameField.state.value}
                          onChange={(e) => nameField.handleChange(e.target.value)}
                          placeholder="e.g. TypeScript"
                        />
                      )}
                    </form.Field>
                    <form.Field name={`skills[${i}].level`}>
                      {(levelField) => (
                        <select
                          value={levelField.state.value}
                          onChange={(e) =>
                            levelField.handleChange(e.target.value as "beginner" | "intermediate" | "expert")
                          }
                        >
                          <option value="beginner">Beginner</option>
                          <option value="intermediate">Intermediate</option>
                          <option value="expert">Expert</option>
                        </select>
                      )}
                    </form.Field>
                    <button type="button" onClick={() => skillsField.removeValue(i)}>
                      Remove
                    </button>
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => skillsField.pushValue({ name: "", level: "beginner" })}
                >
                  + Add Skill
                </button>
              </div>
            )}
          </form.Field>
        </fieldset>
      )}

      <div className="form-actions">
        {step > 1 && (
          <button type="button" onClick={() => setStep(step - 1)}>
            Back
          </button>
        )}
        <form.Subscribe selector={(state) => state.isSubmitting}>
          {(isSubmitting) => (
            <button type="submit" disabled={isSubmitting}>
              {step < 3 ? "Next" : isSubmitting ? "Creating account..." : "Create Account"}
            </button>
          )}
        </form.Subscribe>
      </div>
    </form>
  );
}
```

The `form.Subscribe` component at the bottom subscribes to a single derived value (`isSubmitting`) from the form store without causing the parent component to re-render. This is the same subscription pattern used by the field components, but exposed for arbitrary store selectors.

## When to Choose TanStack Form

TanStack Form is the right choice when:

- You need full TypeScript inference without string-based field paths
- Your forms have many fields and re-render performance is measurable
- You want async validation with built-in debouncing
- You are building a multi-framework codebase (Vue + React sharing form logic)
- You want to avoid wrapping every third-party input in a `Controller`

react-hook-form remains a solid choice for simpler forms where uncontrolled inputs work well and you do not need complex async validation or the strictest possible TypeScript inference. Its smaller bundle and larger ecosystem of resolvers can be practical advantages.

Formik is hard to recommend for new projects in 2026 given its re-render model and slowing maintenance pace.

## Installation

```bash
# React adapter
npm install @tanstack/react-form

# Zod adapter
npm install @tanstack/zod-form-adapter zod

# Valibot adapter
npm install @tanstack/valibot-form-adapter valibot
```

TanStack Form 1.0 requires React 18 or higher. The core package has zero dependencies. The framework adapters add only the minimal framework-specific subscription layer.

## Conclusion

TanStack Form 1.0 represents a mature, production-ready approach to form management that did not exist in the React ecosystem two years ago. The combination of full TypeScript inference from `defaultValues`, first-party schema adapters, built-in async validation with debouncing, and a subscription model that prevents unnecessary re-renders makes it the most technically complete form library available for React in 2026. The headless design means it does not fight your design system, and the framework-agnostic core means form logic can be shared across a polyglot frontend stack.

The API surface is slightly larger than react-hook-form's simplest use cases, but the complexity budget is well spent on features that matter in production: type safety, performance, and composability.
