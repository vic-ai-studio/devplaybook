import { useState } from 'preact/hooks';

const LICENSES: Record<string, { name: string; spdx: string; description: string; text: (author: string, year: string) => string }> = {
  'MIT': {
    name: 'MIT License',
    spdx: 'MIT',
    description: 'Simple permissive license. Allows commercial use, modification, distribution, and private use.',
    text: (author, year) => `MIT License

Copyright (c) ${year} ${author}

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.`,
  },
  'Apache-2.0': {
    name: 'Apache License 2.0',
    spdx: 'Apache-2.0',
    description: 'Permissive license with patent protection clause. Requires NOTICE file and attribution.',
    text: (author, year) => `Apache License
Version 2.0, January 2004
http://www.apache.org/licenses/

Copyright ${year} ${author}

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

    http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License.`,
  },
  'GPL-3.0': {
    name: 'GNU GPL v3',
    spdx: 'GPL-3.0-only',
    description: 'Strong copyleft license. Derivatives must also be GPL. Good for keeping software free.',
    text: (author, year) => `Copyright (C) ${year} ${author}

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <https://www.gnu.org/licenses/>.

GNU GENERAL PUBLIC LICENSE
Version 3, 29 June 2007

Everyone is permitted to copy and distribute verbatim copies
of this license document, but changing it is not allowed.`,
  },
  'BSD-3-Clause': {
    name: 'BSD 3-Clause',
    spdx: 'BSD-3-Clause',
    description: 'Permissive license similar to MIT. Adds a non-endorsement clause.',
    text: (author, year) => `BSD 3-Clause License

Copyright (c) ${year}, ${author}

Redistribution and use in source and binary forms, with or without
modification, are permitted provided that the following conditions are met:

1. Redistributions of source code must retain the above copyright notice, this
   list of conditions and the following disclaimer.

2. Redistributions in binary form must reproduce the above copyright notice,
   this list of conditions and the following disclaimer in the documentation
   and/or other materials provided with the distribution.

3. Neither the name of the copyright holder nor the names of its
   contributors may be used to endorse or promote products derived from
   this software without specific prior written permission.

THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS"
AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE
IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE
FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL
DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR
SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER
CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY,
OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE
OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.`,
  },
  'ISC': {
    name: 'ISC License',
    spdx: 'ISC',
    description: 'Functionally equivalent to MIT/BSD 2-Clause. Preferred by npm packages.',
    text: (author, year) => `ISC License

Copyright (c) ${year}, ${author}

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted, provided that the above
copyright notice and this permission notice appear in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.`,
  },
  'MPL-2.0': {
    name: 'Mozilla Public License 2.0',
    spdx: 'MPL-2.0',
    description: 'Weak copyleft. Modified files must stay MPL, but you can combine with proprietary code.',
    text: (author, year) => `Mozilla Public License Version 2.0
==================================

Copyright (c) ${year} ${author}

This Source Code Form is subject to the terms of the Mozilla Public
License, v. 2.0. If a copy of the MPL was not distributed with this
file, You can obtain one at https://mozilla.org/MPL/2.0/.

This Source Code Form is "Incompatible With Secondary Licenses", as
defined by the Mozilla Public License, v. 2.0.`,
  },
};

export default function OpenSourceLicenseGenerator() {
  const [selectedLicense, setSelectedLicense] = useState('MIT');
  const [author, setAuthor] = useState('');
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const [copied, setCopied] = useState(false);

  const license = LICENSES[selectedLicense];
  const authorDisplay = author.trim() || 'Your Name';
  const output = license.text(authorDisplay, year);

  const copy = async () => {
    await navigator.clipboard.writeText(output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div class="space-y-6">
      {/* License picker */}
      <div class="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {Object.entries(LICENSES).map(([key, lic]) => (
          <button
            key={key}
            onClick={() => setSelectedLicense(key)}
            class={`text-left px-3 py-2.5 rounded-lg border text-sm transition-colors ${
              selectedLicense === key
                ? 'border-brand bg-brand/10 text-brand font-medium'
                : 'border-border bg-surface hover:border-brand/50 text-text-muted'
            }`}
          >
            <div class="font-medium text-text">{lic.spdx}</div>
            <div class="text-xs mt-0.5 line-clamp-1 opacity-70">{lic.name}</div>
          </button>
        ))}
      </div>

      {/* Description */}
      <div class="bg-surface rounded-lg px-4 py-3 text-sm text-text-muted border border-border">
        <span class="font-medium text-text">{license.name}:</span> {license.description}
      </div>

      {/* Inputs */}
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label class="block text-sm font-medium text-text mb-1.5">Author / Organization</label>
          <input
            type="text"
            value={author}
            onInput={(e) => setAuthor((e.target as HTMLInputElement).value)}
            placeholder="Your Name or Company"
            class="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-brand"
          />
        </div>
        <div>
          <label class="block text-sm font-medium text-text mb-1.5">Year</label>
          <input
            type="text"
            value={year}
            onInput={(e) => setYear((e.target as HTMLInputElement).value)}
            placeholder={String(new Date().getFullYear())}
            class="w-full px-3 py-2 bg-surface border border-border rounded-lg text-sm focus:outline-none focus:border-brand"
          />
        </div>
      </div>

      {/* Output */}
      <div>
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-text">LICENSE</span>
          <button
            onClick={copy}
            class="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-brand text-white rounded-md hover:bg-brand/90 transition-colors"
          >
            {copied ? '✓ Copied!' : 'Copy'}
          </button>
        </div>
        <pre class="bg-surface border border-border rounded-lg p-4 text-xs text-text-muted overflow-x-auto whitespace-pre-wrap font-mono leading-relaxed max-h-96 overflow-y-auto">
          {output}
        </pre>
      </div>

      <p class="text-xs text-text-muted">Save this as a <code class="bg-surface px-1 rounded">LICENSE</code> file in your repository root.</p>
    </div>
  );
}
