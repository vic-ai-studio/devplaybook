import { useState, useCallback } from 'preact/hooks';

// ARIA roles with their allowed attributes and descriptions
const ARIA_ROLES: Record<string, { description: string; category: string; allowedAttributes: string[]; requiredAttributes: string[]; htmlElements?: string[] }> = {
  alert: {
    description: 'A type of live region with important, and usually time-sensitive, information.',
    category: 'Live Region',
    allowedAttributes: ['aria-atomic', 'aria-live', 'aria-relevant'],
    requiredAttributes: [],
    htmlElements: [],
  },
  alertdialog: {
    description: 'A type of dialog that contains an alert message, where initial focus goes to an element within the dialog.',
    category: 'Window',
    allowedAttributes: ['aria-modal', 'aria-labelledby', 'aria-describedby'],
    requiredAttributes: [],
  },
  button: {
    description: 'An input that allows for user-triggered actions when clicked or pressed.',
    category: 'Widget',
    allowedAttributes: ['aria-disabled', 'aria-expanded', 'aria-haspopup', 'aria-pressed'],
    requiredAttributes: [],
    htmlElements: ['button', 'input[type=button]', 'input[type=submit]'],
  },
  checkbox: {
    description: 'A checkable input that has three possible values: true, false, or mixed.',
    category: 'Widget',
    allowedAttributes: ['aria-checked', 'aria-disabled', 'aria-readonly', 'aria-required'],
    requiredAttributes: ['aria-checked'],
    htmlElements: ['input[type=checkbox]'],
  },
  combobox: {
    description: 'An input that controls another element that can dynamically pop up to help the user set the value.',
    category: 'Widget',
    allowedAttributes: ['aria-expanded', 'aria-haspopup', 'aria-owns', 'aria-autocomplete', 'aria-required'],
    requiredAttributes: ['aria-expanded', 'aria-controls'],
  },
  dialog: {
    description: 'A dialog is a descendant window of the primary window of a web application.',
    category: 'Window',
    allowedAttributes: ['aria-modal', 'aria-labelledby', 'aria-describedby'],
    requiredAttributes: [],
    htmlElements: ['dialog'],
  },
  grid: {
    description: 'A composite widget containing a collection of one or more rows with one or more cells.',
    category: 'Widget',
    allowedAttributes: ['aria-colcount', 'aria-rowcount', 'aria-multiselectable', 'aria-readonly'],
    requiredAttributes: [],
    htmlElements: ['table'],
  },
  gridcell: {
    description: 'A cell in a grid or treegrid.',
    category: 'Widget',
    allowedAttributes: ['aria-colindex', 'aria-colspan', 'aria-rowindex', 'aria-rowspan', 'aria-selected', 'aria-readonly'],
    requiredAttributes: [],
    htmlElements: ['td'],
  },
  heading: {
    description: 'A heading for a section of the page.',
    category: 'Structure',
    allowedAttributes: ['aria-level'],
    requiredAttributes: [],
    htmlElements: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'],
  },
  img: {
    description: 'A container for a collection of elements that form an image.',
    category: 'Structure',
    allowedAttributes: ['aria-label', 'aria-labelledby', 'aria-describedby'],
    requiredAttributes: [],
    htmlElements: ['img', 'svg'],
  },
  link: {
    description: 'An interactive reference to an internal or external resource.',
    category: 'Widget',
    allowedAttributes: ['aria-disabled', 'aria-expanded', 'aria-haspopup'],
    requiredAttributes: [],
    htmlElements: ['a[href]'],
  },
  listbox: {
    description: 'A widget that allows the user to select one or more items from a list of choices.',
    category: 'Widget',
    allowedAttributes: ['aria-multiselectable', 'aria-required', 'aria-orientation'],
    requiredAttributes: [],
    htmlElements: ['select'],
  },
  log: {
    description: 'A type of live region where new information is added in meaningful order.',
    category: 'Live Region',
    allowedAttributes: ['aria-live', 'aria-atomic', 'aria-relevant'],
    requiredAttributes: [],
  },
  main: {
    description: 'The main content of a document.',
    category: 'Landmark',
    allowedAttributes: [],
    requiredAttributes: [],
    htmlElements: ['main'],
  },
  menu: {
    description: 'A type of widget that offers a list of choices to the user.',
    category: 'Widget',
    allowedAttributes: ['aria-orientation', 'aria-activedescendant'],
    requiredAttributes: [],
  },
  menubar: {
    description: 'A presentation of menu that usually remains visible and is usually presented horizontally.',
    category: 'Widget',
    allowedAttributes: ['aria-orientation', 'aria-activedescendant'],
    requiredAttributes: [],
  },
  menuitem: {
    description: 'An option in a set of choices contained by a menu or menubar.',
    category: 'Widget',
    allowedAttributes: ['aria-disabled', 'aria-expanded', 'aria-haspopup', 'aria-posinset', 'aria-setsize'],
    requiredAttributes: [],
  },
  menuitemcheckbox: {
    description: 'A menuitem with a checkable state whose possible values are true, false, or mixed.',
    category: 'Widget',
    allowedAttributes: ['aria-checked', 'aria-disabled', 'aria-expanded'],
    requiredAttributes: ['aria-checked'],
  },
  menuitemradio: {
    description: 'A checkable menuitem in a group of menuitemradio roles, only one of which can be checked at a time.',
    category: 'Widget',
    allowedAttributes: ['aria-checked', 'aria-disabled', 'aria-posinset', 'aria-setsize'],
    requiredAttributes: ['aria-checked'],
  },
  navigation: {
    description: 'A collection of navigational elements (usually links) for navigating the document or related documents.',
    category: 'Landmark',
    allowedAttributes: ['aria-label', 'aria-labelledby'],
    requiredAttributes: [],
    htmlElements: ['nav'],
  },
  option: {
    description: 'A selectable item in a select list.',
    category: 'Widget',
    allowedAttributes: ['aria-selected', 'aria-checked', 'aria-disabled', 'aria-posinset', 'aria-setsize'],
    requiredAttributes: ['aria-selected'],
    htmlElements: ['option'],
  },
  progressbar: {
    description: 'An element that displays the progress status for tasks that take a long time.',
    category: 'Widget',
    allowedAttributes: ['aria-valuenow', 'aria-valuemin', 'aria-valuemax', 'aria-valuetext'],
    requiredAttributes: [],
    htmlElements: ['progress'],
  },
  radio: {
    description: 'A checkable input in a group of radio roles, only one of which can be checked at a time.',
    category: 'Widget',
    allowedAttributes: ['aria-checked', 'aria-disabled', 'aria-posinset', 'aria-setsize', 'aria-required'],
    requiredAttributes: ['aria-checked'],
    htmlElements: ['input[type=radio]'],
  },
  radiogroup: {
    description: 'A group of radio buttons.',
    category: 'Widget',
    allowedAttributes: ['aria-required', 'aria-orientation'],
    requiredAttributes: [],
    htmlElements: ['fieldset'],
  },
  region: {
    description: 'A perceivable section containing content that is relevant to a specific, author-specified purpose.',
    category: 'Landmark',
    allowedAttributes: ['aria-label', 'aria-labelledby'],
    requiredAttributes: [],
    htmlElements: ['section'],
  },
  row: {
    description: 'A row of cells in a tabular container.',
    category: 'Structure',
    allowedAttributes: ['aria-colindex', 'aria-rowindex', 'aria-selected', 'aria-expanded'],
    requiredAttributes: [],
    htmlElements: ['tr'],
  },
  search: {
    description: 'A landmark region that contains a collection of items and objects that, as a whole, combine to create a search facility.',
    category: 'Landmark',
    allowedAttributes: ['aria-label', 'aria-labelledby'],
    requiredAttributes: [],
    htmlElements: ['search'],
  },
  searchbox: {
    description: 'A type of textbox intended for specifying search criteria.',
    category: 'Widget',
    allowedAttributes: ['aria-autocomplete', 'aria-multiline', 'aria-placeholder', 'aria-required', 'aria-readonly'],
    requiredAttributes: [],
    htmlElements: ['input[type=search]'],
  },
  separator: {
    description: 'A divider that separates and distinguishes sections of content or groups of menuitems.',
    category: 'Structure',
    allowedAttributes: ['aria-orientation', 'aria-valuenow', 'aria-valuemin', 'aria-valuemax'],
    requiredAttributes: [],
    htmlElements: ['hr'],
  },
  slider: {
    description: 'A user input where the user selects a value from within a given range.',
    category: 'Widget',
    allowedAttributes: ['aria-valuenow', 'aria-valuemin', 'aria-valuemax', 'aria-valuetext', 'aria-orientation', 'aria-readonly'],
    requiredAttributes: ['aria-valuenow', 'aria-valuemin', 'aria-valuemax'],
    htmlElements: ['input[type=range]'],
  },
  spinbutton: {
    description: 'A form of range that expects the user to select from among discrete choices.',
    category: 'Widget',
    allowedAttributes: ['aria-valuenow', 'aria-valuemin', 'aria-valuemax', 'aria-valuetext', 'aria-required', 'aria-readonly'],
    requiredAttributes: [],
    htmlElements: ['input[type=number]'],
  },
  status: {
    description: 'A type of live region whose content is advisory information for the user but is not important enough to justify an alert.',
    category: 'Live Region',
    allowedAttributes: ['aria-live', 'aria-atomic'],
    requiredAttributes: [],
  },
  switch: {
    description: 'A type of checkbox that represents on/off values, as opposed to checked/unchecked values.',
    category: 'Widget',
    allowedAttributes: ['aria-checked', 'aria-disabled', 'aria-readonly', 'aria-required'],
    requiredAttributes: ['aria-checked'],
  },
  tab: {
    description: 'A grouping label providing a mechanism for selecting the tab content that is to be rendered to the user.',
    category: 'Widget',
    allowedAttributes: ['aria-selected', 'aria-disabled', 'aria-expanded', 'aria-controls', 'aria-posinset', 'aria-setsize'],
    requiredAttributes: [],
  },
  table: {
    description: 'A section containing data arranged in rows and columns.',
    category: 'Structure',
    allowedAttributes: ['aria-colcount', 'aria-rowcount'],
    requiredAttributes: [],
    htmlElements: ['table'],
  },
  tablist: {
    description: 'A list of tab elements, which are references to tabpanel elements.',
    category: 'Widget',
    allowedAttributes: ['aria-multiselectable', 'aria-orientation'],
    requiredAttributes: [],
  },
  tabpanel: {
    description: 'A container for the resources associated with a tab, where each tab is contained in a tablist.',
    category: 'Widget',
    allowedAttributes: ['aria-labelledby', 'aria-expanded'],
    requiredAttributes: [],
  },
  textbox: {
    description: 'A type of input that allows free-form text as its value.',
    category: 'Widget',
    allowedAttributes: ['aria-autocomplete', 'aria-multiline', 'aria-placeholder', 'aria-required', 'aria-readonly', 'aria-disabled'],
    requiredAttributes: [],
    htmlElements: ['input[type=text]', 'textarea'],
  },
  timer: {
    description: 'A type of live region containing a numerical counter which indicates an amount of elapsed time from a start point.',
    category: 'Live Region',
    allowedAttributes: ['aria-live', 'aria-atomic'],
    requiredAttributes: [],
  },
  toolbar: {
    description: 'A collection of commonly used function buttons or controls represented in compact visual form.',
    category: 'Widget',
    allowedAttributes: ['aria-orientation', 'aria-label', 'aria-labelledby'],
    requiredAttributes: [],
  },
  tooltip: {
    description: 'A contextual popup that displays a description for an element.',
    category: 'Widget',
    allowedAttributes: ['aria-describedby'],
    requiredAttributes: [],
  },
  tree: {
    description: 'A widget that allows the user to select one or more items from a hierarchically organized collection.',
    category: 'Widget',
    allowedAttributes: ['aria-multiselectable', 'aria-required', 'aria-orientation'],
    requiredAttributes: [],
  },
  treeitem: {
    description: 'An option item of a tree. This is an element within a tree that may be expanded or collapsed if it contains a sub-level group of tree item elements.',
    category: 'Widget',
    allowedAttributes: ['aria-expanded', 'aria-level', 'aria-posinset', 'aria-selected', 'aria-setsize', 'aria-disabled'],
    requiredAttributes: [],
  },
};

interface ValidationIssue {
  type: 'error' | 'warning' | 'info';
  message: string;
}

function parseAttributes(attrStr: string): Record<string, string> {
  const result: Record<string, string> = {};
  const regex = /([\w-]+)(?:=["']([^"']*)["'])?/g;
  let match;
  while ((match = regex.exec(attrStr)) !== null) {
    result[match[1]] = match[2] ?? 'true';
  }
  return result;
}

function validateAriaUsage(role: string, attrs: Record<string, string>, element: string): ValidationIssue[] {
  const issues: ValidationIssue[] = [];
  const roleInfo = ARIA_ROLES[role];

  if (!roleInfo) {
    issues.push({ type: 'error', message: `"${role}" is not a valid ARIA role.` });
    return issues;
  }

  // Check required attributes
  for (const req of roleInfo.requiredAttributes) {
    if (!attrs[req]) {
      issues.push({ type: 'error', message: `role="${role}" requires attribute "${req}" — it is missing.` });
    }
  }

  // Check for unknown aria attributes on this role
  const ariaAttrs = Object.keys(attrs).filter(k => k.startsWith('aria-'));
  const allAllowed = [...roleInfo.allowedAttributes, 'aria-label', 'aria-labelledby', 'aria-describedby', 'aria-hidden', 'aria-live', 'aria-atomic', 'aria-relevant', 'aria-busy'];
  for (const attr of ariaAttrs) {
    if (!allAllowed.includes(attr)) {
      issues.push({ type: 'warning', message: `Attribute "${attr}" is not listed as supported for role="${role}". Check WAI-ARIA spec for compatibility.` });
    }
  }

  // Element-specific advice
  if (element && roleInfo.htmlElements && roleInfo.htmlElements.length > 0) {
    const matchesNative = roleInfo.htmlElements.some(el => element.toLowerCase().startsWith(el.split('[')[0]));
    if (matchesNative) {
      issues.push({ type: 'info', message: `Native <${element}> already has implicit role semantics. Using role="${role}" may be redundant — prefer the native element without an explicit role attribute.` });
    }
  }

  if (issues.length === 0) {
    issues.push({ type: 'info', message: `role="${role}" is valid and all required attributes are present.` });
  }

  return issues;
}

const CATEGORIES = ['All', ...Array.from(new Set(Object.values(ARIA_ROLES).map(r => r.category))).sort()];

export default function AriaRolesValidator() {
  const [role, setRole] = useState('button');
  const [attrs, setAttrs] = useState('aria-pressed="false"');
  const [element, setElement] = useState('div');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  const roleInfo = ARIA_ROLES[role];
  const issues = roleInfo ? validateAriaUsage(role, parseAttributes(attrs), element) : [{ type: 'error' as const, message: `"${role}" is not a recognized ARIA role.` }];

  const filteredRoles = Object.entries(ARIA_ROLES).filter(([name, info]) => {
    const matchesSearch = !search || name.includes(search.toLowerCase()) || info.description.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = category === 'All' || info.category === category;
    return matchesSearch && matchesCategory;
  });

  const issueColor = { error: 'text-red-400', warning: 'text-yellow-400', info: 'text-green-400' };
  const issueIcon = { error: '✗', warning: '⚠', info: '✓' };
  const inputClass = 'bg-surface border border-border rounded px-3 py-2 text-sm text-text w-full focus:outline-none focus:ring-1 focus:ring-primary';
  const chipBase = 'px-2.5 py-1 text-xs rounded border cursor-pointer select-none transition-colors';
  const chipActive = 'bg-primary/20 border-primary text-primary';
  const chipInactive = 'bg-surface border-border text-text-muted hover:border-text-muted';

  return (
    <div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Left: validator */}
      <div class="space-y-4">
        <div>
          <label class="block text-sm font-medium text-text mb-1.5">ARIA role</label>
          <select
            value={role}
            onChange={(e) => setRole((e.target as HTMLSelectElement).value)}
            class={inputClass}
          >
            {Object.keys(ARIA_ROLES).sort().map(r => (
              <option key={r} value={r}>{r}</option>
            ))}
          </select>
        </div>

        <div>
          <label class="block text-sm font-medium text-text mb-1.5">ARIA attributes (space-separated)</label>
          <input
            type="text"
            value={attrs}
            onInput={(e) => setAttrs((e.target as HTMLInputElement).value)}
            placeholder='aria-expanded="false" aria-controls="menu"'
            class={inputClass}
          />
          <p class="text-xs text-text-muted mt-1">Enter as you would in HTML, e.g. <code class="font-mono">aria-checked="true"</code></p>
        </div>

        <div>
          <label class="block text-sm font-medium text-text mb-1.5">HTML element <span class="text-text-muted font-normal">(for redundancy check)</span></label>
          <input
            type="text"
            value={element}
            onInput={(e) => setElement((e.target as HTMLInputElement).value)}
            placeholder="div, button, a, input..."
            class={inputClass}
          />
        </div>

        {/* Validation results */}
        <div class="bg-surface border border-border rounded p-4 space-y-2">
          <p class="text-sm font-medium text-text mb-2">Validation Results</p>
          {issues.map((issue, i) => (
            <div key={i} class={`flex items-start gap-2 text-sm ${issueColor[issue.type]}`}>
              <span class="mt-0.5 font-bold">{issueIcon[issue.type]}</span>
              <span>{issue.message}</span>
            </div>
          ))}
        </div>

        {/* Role info */}
        {roleInfo && (
          <div class="bg-surface border border-border rounded p-4 space-y-3 text-sm">
            <div>
              <span class="text-text-muted">Category: </span>
              <span class="font-medium text-text">{roleInfo.category}</span>
            </div>
            <div>
              <span class="text-text-muted block mb-1">Description:</span>
              <span class="text-text">{roleInfo.description}</span>
            </div>
            {roleInfo.requiredAttributes.length > 0 && (
              <div>
                <span class="text-text-muted block mb-1">Required attributes:</span>
                <div class="flex flex-wrap gap-1">
                  {roleInfo.requiredAttributes.map(a => (
                    <code key={a} class="text-xs bg-red-900/30 border border-red-500/30 text-red-400 px-2 py-0.5 rounded">{a}</code>
                  ))}
                </div>
              </div>
            )}
            {roleInfo.allowedAttributes.length > 0 && (
              <div>
                <span class="text-text-muted block mb-1">Supported attributes:</span>
                <div class="flex flex-wrap gap-1">
                  {roleInfo.allowedAttributes.map(a => (
                    <code key={a} class="text-xs bg-surface border border-border text-text-muted px-2 py-0.5 rounded">{a}</code>
                  ))}
                </div>
              </div>
            )}
            {roleInfo.htmlElements && roleInfo.htmlElements.length > 0 && (
              <div>
                <span class="text-text-muted block mb-1">Native HTML equivalents:</span>
                <div class="flex flex-wrap gap-1">
                  {roleInfo.htmlElements.map(el => (
                    <code key={el} class="text-xs bg-blue-900/20 border border-blue-500/30 text-blue-400 px-2 py-0.5 rounded">{`<${el}>`}</code>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right: role reference */}
      <div>
        <div class="flex items-center gap-2 mb-3 flex-wrap">
          <input
            type="text"
            value={search}
            onInput={(e) => setSearch((e.target as HTMLInputElement).value)}
            placeholder="Search roles..."
            class="bg-surface border border-border rounded px-3 py-1.5 text-sm text-text focus:outline-none focus:ring-1 focus:ring-primary flex-1 min-w-0"
          />
        </div>
        <div class="flex flex-wrap gap-1.5 mb-3">
          {CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              class={`${chipBase} ${category === cat ? chipActive : chipInactive}`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div class="space-y-1.5 max-h-[480px] overflow-y-auto pr-1">
          {filteredRoles.map(([name, info]) => (
            <button
              key={name}
              onClick={() => { setRole(name); setAttrs(info.requiredAttributes.map(a => `${a}=""`).join(' ')); }}
              class={`w-full text-left px-3 py-2 rounded border text-sm transition-colors ${role === name ? 'bg-primary/10 border-primary text-primary' : 'bg-surface border-border text-text hover:border-text-muted'}`}
            >
              <span class="font-mono font-medium">{name}</span>
              <span class="text-xs text-text-muted ml-2">({info.category})</span>
            </button>
          ))}
          {filteredRoles.length === 0 && (
            <p class="text-sm text-text-muted text-center py-4">No roles match your search.</p>
          )}
        </div>
      </div>
    </div>
  );
}
