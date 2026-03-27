import { useState, useCallback } from 'preact/hooks';

type Locale = 'en' | 'zh-TW' | 'ja';
type OutputFormat = 'json' | 'csv' | 'sql';

interface Field {
  key: string;
  label: string;
  enabled: boolean;
}

const FIELDS: Field[] = [
  { key: 'name', label: 'Full Name', enabled: true },
  { key: 'email', label: 'Email', enabled: true },
  { key: 'phone', label: 'Phone', enabled: true },
  { key: 'address', label: 'Address', enabled: true },
  { key: 'company', label: 'Company', enabled: true },
  { key: 'avatar', label: 'Avatar URL', enabled: false },
  { key: 'username', label: 'Username', enabled: false },
  { key: 'birthdate', label: 'Birthdate', enabled: false },
  { key: 'country', label: 'Country', enabled: false },
];

const DATA: Record<Locale, {
  firstNames: string[];
  lastNames: string[];
  domains: string[];
  streets: string[];
  cities: string[];
  companies: string[];
  countries: string[];
  areaCodes: string[];
}> = {
  en: {
    firstNames: ['Alice','Bob','Charlie','Diana','Eve','Frank','Grace','Henry','Iris','Jack','Karen','Leo','Mia','Nathan','Olivia','Paul','Quinn','Rachel','Sam','Tina'],
    lastNames: ['Smith','Johnson','Williams','Brown','Jones','Garcia','Miller','Davis','Wilson','Taylor','Anderson','Thomas','Jackson','White','Harris','Martin','Thompson','Moore','Young','Allen'],
    domains: ['gmail.com','yahoo.com','outlook.com','hotmail.com','icloud.com','proton.me','hey.com'],
    streets: ['Main St','Oak Ave','Maple Dr','Cedar Ln','Park Blvd','Elm St','Pine Rd','Lake Dr','River Rd','Hill Ave'],
    cities: ['New York','Los Angeles','Chicago','Houston','Phoenix','Philadelphia','San Antonio','San Diego','Dallas','San Jose'],
    companies: ['Acme Corp','TechVentures','GlobalSoft','InnovateCo','DataStream','CloudNine','NextGen','Apex Systems','BlueStar','QuantumLeap'],
    countries: ['United States','United Kingdom','Canada','Australia','Germany','France','Japan','South Korea','Singapore','Netherlands'],
    areaCodes: ['212','310','415','713','602','215','210','619','214','408'],
  },
  'zh-TW': {
    firstNames: ['志明','美玲','建國','淑芬','大偉','雅婷','文雄','佳琪','俊傑','麗華','冠宇','詩婷','承翰','欣怡','宗翰'],
    lastNames: ['陳','林','黃','張','李','王','吳','劉','蔡','楊','許','鄭','謝','洪','邱'],
    domains: ['gmail.com','yahoo.com.tw','hotmail.com','icloud.com','pchome.com.tw'],
    streets: ['中山路','忠孝東路','信義路','仁愛路','復興北路','民生東路','建國北路','光復南路','南京西路','博愛路'],
    cities: ['台北市','新北市','台中市','高雄市','台南市','桃園市','新竹市','嘉義市','基隆市','彰化縣'],
    companies: ['台灣科技','遠景科技','創新資訊','數位雲端','全球網路','智慧系統','未來科技','宏觀資訊','聯合數位','卓越科技'],
    countries: ['台灣','日本','美國','韓國','新加坡','香港','澳洲','英國','法國','德國'],
    areaCodes: ['02','04','07','06','03','037','049','05','038','089'],
  },
  ja: {
    firstNames: ['太郎','花子','一郎','美子','健二','由美','浩一','恵子','誠','優子','拓也','愛','翔太','麻衣','航'],
    lastNames: ['佐藤','鈴木','高橋','田中','伊藤','渡辺','山本','中村','小林','加藤','吉田','山田','佐々木','山口','松本'],
    domains: ['gmail.com','yahoo.co.jp','outlook.jp','icloud.com','docomo.ne.jp'],
    streets: ['桜通り','中央通り','本町通り','銀座通り','大通り','花見通り','港通り','緑通り','南通り','北通り'],
    cities: ['東京','大阪','名古屋','札幌','福岡','京都','神戸','広島','仙台','千葉'],
    companies: ['東京テック','未来ソフト','グローバルIT','スマートシステム','デジタル革新','クラウドネット','テクノコア','イノベーション','サイバーネクスト','デジタルドリーム'],
    countries: ['日本','アメリカ','中国','韓国','台湾','シンガポール','オーストラリア','イギリス','フランス','ドイツ'],
    areaCodes: ['03','06','052','011','092','075','078','082','022','043'],
  },
};

function rand<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function generateRecord(locale: Locale, index: number): Record<string, string> {
  const d = DATA[locale];
  const firstName = rand(d.firstNames);
  const lastName = rand(d.lastNames);
  const name = locale === 'en' ? `${firstName} ${lastName}` : `${lastName}${firstName}`;
  const username = `${firstName.toLowerCase().replace(/\s/g, '')}${randInt(10, 999)}`;
  const email = `${username}@${rand(d.domains)}`;
  const areaCode = rand(d.areaCodes);
  const phone = locale === 'zh-TW'
    ? `${areaCode}-${randInt(1000, 9999)}-${randInt(1000, 9999)}`
    : locale === 'ja'
    ? `${areaCode}-${randInt(1000, 9999)}-${randInt(1000, 9999)}`
    : `+1 (${areaCode}) ${randInt(100, 999)}-${randInt(1000, 9999)}`;
  const address = locale === 'en'
    ? `${randInt(1, 9999)} ${rand(d.streets)}, ${rand(d.cities)}`
    : locale === 'zh-TW'
    ? `${rand(d.cities)}${rand(d.streets)}${randInt(1, 200)}號`
    : `${rand(d.cities)}${rand(d.streets)}${randInt(1, 50)}-${randInt(1, 20)}`;
  const company = rand(d.companies);
  const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(name + index)}`;
  const year = randInt(1960, 2005);
  const month = String(randInt(1, 12)).padStart(2, '0');
  const day = String(randInt(1, 28)).padStart(2, '0');
  const birthdate = `${year}-${month}-${day}`;
  const country = rand(d.countries);

  return { name, email, phone, address, company, avatar, username, birthdate, country };
}

function toCSV(records: Record<string, string>[], fields: string[]): string {
  const header = fields.join(',');
  const rows = records.map(r =>
    fields.map(f => {
      const v = r[f] ?? '';
      return v.includes(',') || v.includes('"') || v.includes('\n') ? `"${v.replace(/"/g, '""')}"` : v;
    }).join(',')
  );
  return [header, ...rows].join('\n');
}

function toSQL(records: Record<string, string>[], fields: string[], tableName: string): string {
  const cols = fields.map(f => `\`${f}\``).join(', ');
  const rows = records.map(r => {
    const vals = fields.map(f => `'${(r[f] ?? '').replace(/'/g, "''")}'`).join(', ');
    return `  (${vals})`;
  });
  return `INSERT INTO \`${tableName}\` (${cols})\nVALUES\n${rows.join(',\n')};`;
}

export default function FakeDataGenerator() {
  const [locale, setLocale] = useState<Locale>('en');
  const [count, setCount] = useState(5);
  const [format, setFormat] = useState<OutputFormat>('json');
  const [fields, setFields] = useState<Field[]>(FIELDS);
  const [tableName, setTableName] = useState('users');
  const [output, setOutput] = useState('');
  const [copied, setCopied] = useState(false);

  const enabledFields = fields.filter(f => f.enabled);

  const generate = useCallback(() => {
    const records = Array.from({ length: count }, (_, i) => generateRecord(locale, i));
    const enabledKeys = fields.filter(f => f.enabled).map(f => f.key);

    let result = '';
    if (format === 'json') {
      const filtered = records.map(r => {
        const obj: Record<string, string> = {};
        enabledKeys.forEach(k => { obj[k] = r[k]; });
        return obj;
      });
      result = JSON.stringify(filtered, null, 2);
    } else if (format === 'csv') {
      result = toCSV(records, enabledKeys);
    } else {
      result = toSQL(records, enabledKeys, tableName);
    }
    setOutput(result);
    setCopied(false);
  }, [locale, count, format, fields, tableName]);

  const copy = () => {
    navigator.clipboard.writeText(output).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const toggleField = (key: string) => {
    setFields(prev => prev.map(f => f.key === key ? { ...f, enabled: !f.enabled } : f));
  };

  const inputClass = 'px-3 py-2 rounded-lg bg-surface border border-border text-text text-sm focus:outline-none focus:ring-2 focus:ring-accent';

  return (
    <div class="space-y-5">
      {/* Controls */}
      <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label class="block text-xs text-text-muted mb-1">Locale</label>
          <select value={locale} onChange={e => setLocale((e.target as HTMLSelectElement).value as Locale)} class={`${inputClass} w-full`}>
            <option value="en">English (en)</option>
            <option value="zh-TW">繁體中文 (zh-TW)</option>
            <option value="ja">日本語 (ja)</option>
          </select>
        </div>
        <div>
          <label class="block text-xs text-text-muted mb-1">Count (1–100)</label>
          <input type="number" min={1} max={100} value={count}
            onInput={e => setCount(Math.min(100, Math.max(1, parseInt((e.target as HTMLInputElement).value) || 1)))}
            class={`${inputClass} w-full`} />
        </div>
        <div>
          <label class="block text-xs text-text-muted mb-1">Output Format</label>
          <select value={format} onChange={e => setFormat((e.target as HTMLSelectElement).value as OutputFormat)} class={`${inputClass} w-full`}>
            <option value="json">JSON</option>
            <option value="csv">CSV</option>
            <option value="sql">SQL INSERT</option>
          </select>
        </div>
        {format === 'sql' && (
          <div>
            <label class="block text-xs text-text-muted mb-1">Table Name</label>
            <input value={tableName} onInput={e => setTableName((e.target as HTMLInputElement).value)}
              class={`${inputClass} w-full`} placeholder="users" />
          </div>
        )}
      </div>

      {/* Field toggles */}
      <div>
        <p class="text-xs text-text-muted mb-2">Fields to include</p>
        <div class="flex flex-wrap gap-2">
          {fields.map(f => (
            <button key={f.key} onClick={() => toggleField(f.key)}
              class={`px-3 py-1.5 rounded-lg text-xs border transition-colors ${f.enabled ? 'bg-accent text-white border-accent' : 'bg-surface border-border text-text-muted hover:border-accent hover:text-accent'}`}>
              {f.label}
            </button>
          ))}
        </div>
        {enabledFields.length === 0 && (
          <p class="text-xs text-red-400 mt-2">Select at least one field.</p>
        )}
      </div>

      {/* Generate button */}
      <button onClick={generate} disabled={enabledFields.length === 0}
        class="px-6 py-2.5 rounded-lg bg-accent text-white font-semibold text-sm hover:bg-accent/90 transition-colors disabled:opacity-50">
        Generate {count} Record{count !== 1 ? 's' : ''}
      </button>

      {/* Output */}
      {output && (
        <div class="space-y-2">
          <div class="flex items-center justify-between">
            <p class="text-xs text-text-muted">{format.toUpperCase()} output — {count} record{count !== 1 ? 's' : ''}</p>
            <button onClick={copy}
              class="px-3 py-1.5 rounded-lg bg-accent text-white text-xs font-medium hover:bg-accent/90 transition-colors">
              {copied ? '✓ Copied!' : 'Copy'}
            </button>
          </div>
          <pre class="p-4 rounded-xl bg-surface border border-border text-text text-xs font-mono overflow-auto max-h-96 whitespace-pre-wrap break-all">{output}</pre>
        </div>
      )}
    </div>
  );
}
