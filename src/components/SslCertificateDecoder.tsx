import { useState } from 'preact/hooks';

// ---- Minimal DER/ASN.1 parser ----

interface DerNode {
  tag: number;
  tagClass: number; // 0=universal, 1=application, 2=context, 3=private
  constructed: boolean;
  length: number;
  value: Uint8Array;
  children?: DerNode[];
}

function parseDer(data: Uint8Array, offset = 0): { node: DerNode; end: number } {
  if (offset >= data.length) throw new Error('Unexpected end of data');

  const tagByte = data[offset];
  const tagClass = (tagByte >> 6) & 0x03;
  const constructed = !!(tagByte & 0x20);
  let tag = tagByte & 0x1f;
  let pos = offset + 1;

  if (tag === 0x1f) {
    tag = 0;
    do {
      if (pos >= data.length) throw new Error('Unexpected end in long tag');
      tag = (tag << 7) | (data[pos] & 0x7f);
    } while (data[pos++] & 0x80);
  }

  if (pos >= data.length) throw new Error('Unexpected end before length');
  let length = 0;
  const lenByte = data[pos++];
  if (lenByte & 0x80) {
    const numBytes = lenByte & 0x7f;
    if (numBytes > 4) throw new Error('Length too large');
    for (let i = 0; i < numBytes; i++) {
      if (pos >= data.length) throw new Error('Unexpected end in length');
      length = (length << 8) | data[pos++];
    }
  } else {
    length = lenByte;
  }

  const end = pos + length;
  if (end > data.length) throw new Error(`Length ${length} exceeds buffer`);
  const value = data.slice(pos, end);

  const node: DerNode = { tag, tagClass, constructed, length, value };

  if (constructed) {
    node.children = [];
    let childPos = 0;
    while (childPos < value.length) {
      try {
        const { node: child, end: childEnd } = parseDer(value, childPos);
        node.children.push(child);
        childPos = childEnd;
      } catch {
        break;
      }
    }
  }

  return { node, end };
}

function derInt(data: Uint8Array): string {
  // Remove leading zero byte used for sign
  let start = 0;
  while (start < data.length - 1 && data[start] === 0) start++;
  return Array.from(data.slice(start)).map(b => b.toString(16).padStart(2, '0')).join(':');
}

function derBigIntStr(data: Uint8Array): string {
  let start = 0;
  while (start < data.length - 1 && data[start] === 0) start++;
  let result = BigInt(0);
  for (const byte of data.slice(start)) {
    result = (result << BigInt(8)) | BigInt(byte);
  }
  return result.toString();
}

function derOid(data: Uint8Array): string {
  if (data.length < 2) return '';
  const first = data[0];
  const parts: number[] = [Math.floor(first / 40), first % 40];
  let val = 0;
  for (let i = 1; i < data.length; i++) {
    val = (val << 7) | (data[i] & 0x7f);
    if (!(data[i] & 0x80)) {
      parts.push(val);
      val = 0;
    }
  }
  return parts.join('.');
}

function derUtf8(data: Uint8Array): string {
  return new TextDecoder('utf-8').decode(data);
}

function derPrintable(data: Uint8Array): string {
  return new TextDecoder('ascii').decode(data);
}

function derTime(data: Uint8Array, tag: number): Date | null {
  try {
    const str = new TextDecoder('ascii').decode(data);
    if (tag === 0x17) {
      // UTCTime: YYMMDDHHMMSSZ
      const year = parseInt(str.slice(0, 2));
      const fullYear = year >= 50 ? 1900 + year : 2000 + year;
      return new Date(Date.UTC(
        fullYear,
        parseInt(str.slice(2, 4)) - 1,
        parseInt(str.slice(4, 6)),
        parseInt(str.slice(6, 8)),
        parseInt(str.slice(8, 10)),
        parseInt(str.slice(10, 12)),
      ));
    } else {
      // GeneralizedTime: YYYYMMDDHHMMSSZ
      return new Date(Date.UTC(
        parseInt(str.slice(0, 4)),
        parseInt(str.slice(4, 6)) - 1,
        parseInt(str.slice(6, 8)),
        parseInt(str.slice(8, 10)),
        parseInt(str.slice(10, 12)),
        parseInt(str.slice(12, 14)),
      ));
    }
  } catch {
    return null;
  }
}

const OID_NAMES: Record<string, string> = {
  '2.5.4.3': 'CN',
  '2.5.4.6': 'C',
  '2.5.4.7': 'L',
  '2.5.4.8': 'ST',
  '2.5.4.10': 'O',
  '2.5.4.11': 'OU',
  '2.5.4.5': 'serialNumber',
  '1.2.840.113549.1.9.1': 'emailAddress',
  '1.2.840.113549.1.1.1': 'rsaEncryption',
  '1.2.840.113549.1.1.5': 'sha1WithRSAEncryption',
  '1.2.840.113549.1.1.11': 'sha256WithRSAEncryption',
  '1.2.840.113549.1.1.12': 'sha384WithRSAEncryption',
  '1.2.840.113549.1.1.13': 'sha512WithRSAEncryption',
  '1.2.840.10045.4.3.2': 'ecdsa-with-SHA256',
  '1.2.840.10045.4.3.3': 'ecdsa-with-SHA384',
  '1.2.840.10045.4.3.4': 'ecdsa-with-SHA512',
  '2.5.29.17': 'subjectAltName',
  '2.5.29.15': 'keyUsage',
  '2.5.29.37': 'extKeyUsage',
  '2.5.29.19': 'basicConstraints',
  '2.5.29.14': 'subjectKeyIdentifier',
  '1.3.6.1.5.5.7.3.1': 'serverAuth',
  '1.3.6.1.5.5.7.3.2': 'clientAuth',
  '1.3.6.1.5.5.7.3.3': 'codeSigning',
  '1.3.6.1.5.5.7.3.4': 'emailProtection',
};

function parseDnSeq(seq: DerNode): string {
  if (!seq.children) return '';
  const parts: string[] = [];
  for (const set of seq.children) {
    if (!set.children) continue;
    for (const atv of set.children) {
      if (!atv.children || atv.children.length < 2) continue;
      const oidNode = atv.children[0];
      const valNode = atv.children[1];
      const oid = derOid(oidNode.value);
      const name = OID_NAMES[oid] || oid;
      let val = '';
      // UTF8String=12, PrintableString=19, IA5String=22, BMPString=30, UTF8=0x0c
      if (valNode.tag === 0x0c || valNode.tag === 0x13 || valNode.tag === 0x16 || valNode.tag === 0x1e) {
        val = valNode.tag === 0x1e
          ? new TextDecoder('utf-16be').decode(valNode.value)
          : derPrintable(valNode.value);
      } else {
        val = derPrintable(valNode.value);
      }
      parts.push(`${name}=${val}`);
    }
  }
  return parts.join(', ');
}

interface CertInfo {
  subject: string;
  issuer: string;
  serialNumber: string;
  notBefore: Date | null;
  notAfter: Date | null;
  sigAlgorithm: string;
  sans: string[];
  keyUsage: string[];
  extKeyUsage: string[];
  isCA: boolean;
  fingerprint: string;
  raw: Uint8Array;
}

async function computeFingerprint(der: Uint8Array): Promise<string> {
  const hashBuffer = await crypto.subtle.digest('SHA-256', der);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join(':');
}

function parseSANs(extValueData: Uint8Array): string[] {
  const sans: string[] = [];
  try {
    // extValueData is an OCTET STRING containing a SEQUENCE of GeneralNames
    const { node: outer } = parseDer(extValueData, 0);
    const inner = outer.constructed ? outer : (() => { const r = parseDer(outer.value, 0); return r.node; })();
    const children = inner.children || [];
    for (const gn of children) {
      // tag 2 = dNSName, tag 7 = iPAddress, tag 1 = rfc822Name
      if (gn.tagClass === 2 && gn.tag === 2) {
        sans.push(derPrintable(gn.value));
      } else if (gn.tagClass === 2 && gn.tag === 7) {
        if (gn.value.length === 4) {
          sans.push(Array.from(gn.value).join('.'));
        } else {
          sans.push(Array.from(gn.value).map(b => b.toString(16).padStart(2, '0')).join(':'));
        }
      } else if (gn.tagClass === 2 && gn.tag === 1) {
        sans.push(derPrintable(gn.value));
      }
    }
  } catch {
    // ignore
  }
  return sans;
}

function parseKeyUsage(extValueData: Uint8Array): string[] {
  const usageNames = ['digitalSignature', 'nonRepudiation', 'keyEncipherment', 'dataEncipherment', 'keyAgreement', 'keyCertSign', 'cRLSign', 'encipherOnly', 'decipherOnly'];
  const result: string[] = [];
  try {
    const { node: outer } = parseDer(extValueData, 0);
    const bs = outer.tag === 0x03 ? outer : parseDer(outer.value, 0).node;
    if (bs.value.length < 2) return result;
    const unusedBits = bs.value[0];
    const byteVal = bs.value[1];
    for (let i = 0; i < 8 - unusedBits; i++) {
      if (byteVal & (0x80 >> i)) result.push(usageNames[i] || `bit${i}`);
    }
  } catch {
    // ignore
  }
  return result;
}

function parseExtKeyUsage(extValueData: Uint8Array): string[] {
  const result: string[] = [];
  try {
    const { node: outer } = parseDer(extValueData, 0);
    const seq = outer.constructed ? outer : parseDer(outer.value, 0).node;
    for (const child of seq.children || []) {
      const oid = derOid(child.value);
      result.push(OID_NAMES[oid] || oid);
    }
  } catch {
    // ignore
  }
  return result;
}

function parseIsCA(extValueData: Uint8Array): boolean {
  try {
    const { node: outer } = parseDer(extValueData, 0);
    const seq = outer.constructed ? outer : parseDer(outer.value, 0).node;
    if (seq.children && seq.children.length > 0) {
      const boolNode = seq.children[0];
      return boolNode.tag === 0x01 && boolNode.value[0] !== 0;
    }
  } catch {
    // ignore
  }
  return false;
}

async function decodeCertificate(pem: string): Promise<CertInfo> {
  const b64 = pem
    .replace(/-----BEGIN CERTIFICATE-----/, '')
    .replace(/-----END CERTIFICATE-----/, '')
    .replace(/\s+/g, '');

  const binaryStr = atob(b64);
  const der = new Uint8Array(binaryStr.length);
  for (let i = 0; i < binaryStr.length; i++) {
    der[i] = binaryStr.charCodeAt(i);
  }

  const fingerprint = await computeFingerprint(der);

  // Parse outer SEQUENCE
  const { node: certSeq } = parseDer(der, 0);
  if (!certSeq.children || certSeq.children.length < 2) {
    throw new Error('Invalid certificate structure');
  }

  const tbsCert = certSeq.children[0]; // TBSCertificate SEQUENCE
  const sigAlgSeq = certSeq.children[1]; // signatureAlgorithm

  // Signature algorithm
  let sigAlgorithm = 'Unknown';
  if (sigAlgSeq.children && sigAlgSeq.children.length > 0) {
    const oid = derOid(sigAlgSeq.children[0].value);
    sigAlgorithm = OID_NAMES[oid] || oid;
  }

  if (!tbsCert.children) throw new Error('Empty TBSCertificate');

  // Determine field offsets — version is optional [0] EXPLICIT
  let idx = 0;
  let serialNumber = '';
  let issuer = '';
  let subject = '';
  let notBefore: Date | null = null;
  let notAfter: Date | null = null;
  const sans: string[] = [];
  const keyUsage: string[] = [];
  const extKeyUsage: string[] = [];
  let isCA = false;

  const children = tbsCert.children;

  // Skip optional version [0]
  if (children[idx] && children[idx].tagClass === 2 && children[idx].tag === 0) {
    idx++;
  }

  // serialNumber INTEGER
  if (children[idx] && children[idx].tag === 0x02) {
    serialNumber = derInt(children[idx].value);
    idx++;
  }

  // signature AlgorithmIdentifier SEQUENCE
  idx++; // skip

  // issuer Name SEQUENCE
  if (children[idx] && (children[idx].tag === 0x10 || children[idx].constructed)) {
    issuer = parseDnSeq(children[idx]);
    idx++;
  }

  // validity SEQUENCE
  if (children[idx] && children[idx].children) {
    const valSeq = children[idx];
    if (valSeq.children && valSeq.children.length >= 2) {
      notBefore = derTime(valSeq.children[0].value, valSeq.children[0].tag);
      notAfter = derTime(valSeq.children[1].value, valSeq.children[1].tag);
    }
    idx++;
  }

  // subject Name SEQUENCE
  if (children[idx] && (children[idx].tag === 0x10 || children[idx].constructed)) {
    subject = parseDnSeq(children[idx]);
    idx++;
  }

  // subjectPublicKeyInfo SEQUENCE — skip
  idx++;

  // Extensions [3] EXPLICIT SEQUENCE (optional)
  for (let i = idx; i < children.length; i++) {
    const field = children[i];
    if (field.tagClass === 2 && field.tag === 3 && field.constructed) {
      // [3] Extensions
      const extSeq = field.children && field.children[0];
      if (!extSeq || !extSeq.children) continue;
      for (const ext of extSeq.children) {
        if (!ext.children || ext.children.length < 2) continue;
        const oid = derOid(ext.children[0].value);

        // Find the OCTET STRING value (may have a critical boolean before it)
        let octetNode = ext.children[1];
        if (octetNode.tag === 0x01) {
          // boolean (critical) — skip to next
          octetNode = ext.children[2];
        }
        if (!octetNode || octetNode.tag !== 0x04) continue;
        const extVal = octetNode.value;

        if (oid === '2.5.29.17') {
          sans.push(...parseSANs(extVal));
        } else if (oid === '2.5.29.15') {
          keyUsage.push(...parseKeyUsage(extVal));
        } else if (oid === '2.5.29.37') {
          extKeyUsage.push(...parseExtKeyUsage(extVal));
        } else if (oid === '2.5.29.19') {
          isCA = parseIsCA(extVal);
        }
      }
    }
  }

  return { subject, issuer, serialNumber, notBefore, notAfter, sigAlgorithm, sans, keyUsage, extKeyUsage, isCA, fingerprint, raw: der };
}

// ---- Component ----

const EXAMPLE_CERT = `-----BEGIN CERTIFICATE-----
MIIFazCCA1OgAwIBAgIRAIIQz7DSQONZRGPgu2OCiwAwDQYJKoZIhvcNAQELBQAw
TzELMAkGA1UEBhMCVVMxKTAnBgNVBAoTIEludGVybmV0IFNlY3VyaXR5IFJlc2Vh
cmNoIEdyb3VwMRUwEwYDVQQDEwxJU1JHIFJvb3QgWDEwHhcNMTUwNjA0MTEwNDM4
WhcNMzUwNjA0MTEwNDM4WjBPMQswCQYDVQQGEwJVUzEpMCcGA1UEChMgSW50ZXJu
ZXQgU2VjdXJpdHkgUmVzZWFyY2ggR3JvdXAxFTATBgNVBAMTDElTUkcgUm9vdCBY
MTCCAiIwDQYJKoZIhvcNAQEBBQADggIPADCCAgoBggIBAK3oJHP0FDfzm54rVygc
h77ct984kIxuPOZXoHj3dcKi/vVqbvYATyjb3miGbESTtrFj/RQSa78f0uoxmyF+
0TM8ukj13Xnfs7j/EvEhmkvBioZxaUpmZmyPfjxwv60pIgbz5MDmgK7iS4+3mX6U
A5/TR5d8mUgjU+g4rk8Kb4Mu0UlXjIB0ttov0DiNewNwIRt18jA8+o+u3dpjq+sW
T8KOEUt+zwvo/7V3LvSye0rgTBIlDHCNAymg4VMk7BPZ7hm/ELNKjD+Jo2FR3qyH
B5T0Y3HsLuJvW5iB4YlcNHlsdu87kGJ55tukmi8mxdAQ4Q7e2RCOFvu396j3x+UC
B5iPNgiV5+I3lg02dZ77DnKxHZu8A/lJBdiB3QW0KtZB6awBdpUKD9jf1b0SHzUv
KBds0pjBqAlkd25HN7rOrFleaJ1/ctaJxQZBKT5ZPt0m9STJEadao0xAH0ahmbWn
OlFuhjuefXKnEgV4We0+UXgVCwOPjdAvBbI+e0ocS3MFEvzG6uBQE3xDk3SzynTn
jh8BCNAw1FtxNrQHusEwMFxIt4I7mKZ9YIqioymCzLq9gwQbooMDQaHWBfEbwrbw
qHyGO0aoSCqI3Haadr8faqU9GY/rOPNk3sgrDQoo//fb4hVC1CLQJ13hef4Y53CI
rU7m2Ys6xt0nUW7/vGT1M0NPAgMBAAGjQjBAMA4GA1UdDwEB/wQEAwIBBjAPBgNV
HRMBAf8EBTADAQH/MB0GA1UdDgQWBBR5tFnme7bl5AFzgAiIyBpY9umbbjANBgkq
hkiG9w0BAQsFAAOCAgEAVR9YqbyyqFDQDLHYGmkgJykIrGF1XIpu+ILlaS/V9lZL
ubhzEFnTIZd+50xx+7LSYK05qAvqFyFWhfFQDlnrzuBZ6brJFe+GnY+EgPbk6ZGQ
3BebYhtF8GaV0nxvwuo77x/Py9auJ/GpsMiu/X1+mvoiBOv/2X/qkSsisRcOj/KK
NFtY2PwByVS5uCbMiogziUwthDyC3+6WVwW6LLv3xLfHTjuCvjHIInNzktHCgKQ5
ORAzI4JMPJ+GslWYHb4phowim57iaztXOoJwTdwJx4nLCgdNbOhdjsnvzqvHu7Ur
TkXWStAmzOVyyghqpZXjFaH3pO3JLF+l+/+sKAIuvtd7u+Nxe5AW0wdeRlN8NwdC
jNPElpzVmbUq4JUagEiuTDkHzsxHpFKVK7q4+63SM1N95R1NbdWhscdCb+ZAJzVc
oyi3B43njTOQ5yOf+1CceWxG1bQVs5ZufpsMljq4Ui0/1lvh+wjChP4kqKOJ2qxq
4RgqsahDYVvTH9w7jXbyLeiNdd8XM2w9U/t7y0Ff/9yi0GE44Za4rF2LN9d11TPA
mRGunUHBcnWEvgJBQl9nJEiU0Zsnvgc/ubhPgXRR4Xq37Z0j4r7g1SgEEzwxA57d
emyPxgcYxn/eR44/KJ4EBs+lVDR3veyJm+kXQ99b21/+jh5Xos1AnX5iItreGCc=
-----END CERTIFICATE-----`;

interface DecodedCert {
  subject: string;
  issuer: string;
  serialNumber: string;
  notBefore: Date | null;
  notAfter: Date | null;
  sigAlgorithm: string;
  sans: string[];
  keyUsage: string[];
  extKeyUsage: string[];
  isCA: boolean;
  fingerprint: string;
  daysUntilExpiry: number;
  parseError?: string;
}

export default function SslCertificateDecoder() {
  const [pem, setPem] = useState('');
  const [cert, setCert] = useState<DecodedCert | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [copiedFp, setCopiedFp] = useState(false);

  async function decode(input: string) {
    setLoading(true);
    setError('');
    setCert(null);

    try {
      const cleaned = input.trim();
      if (!cleaned.includes('-----BEGIN CERTIFICATE-----')) {
        setError('Input must be a PEM certificate starting with -----BEGIN CERTIFICATE-----');
        setLoading(false);
        return;
      }

      const info = await decodeCertificate(cleaned);
      const now = new Date();
      const daysUntilExpiry = info.notAfter
        ? Math.floor((info.notAfter.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
        : 0;

      setCert({
        subject: info.subject,
        issuer: info.issuer,
        serialNumber: info.serialNumber,
        notBefore: info.notBefore,
        notAfter: info.notAfter,
        sigAlgorithm: info.sigAlgorithm,
        sans: info.sans,
        keyUsage: info.keyUsage,
        extKeyUsage: info.extKeyUsage,
        isCA: info.isCA,
        fingerprint: info.fingerprint,
        daysUntilExpiry,
      });
    } catch (e) {
      setError(`Parse error: ${(e as Error).message}. The certificate may use an unsupported encoding.`);
    }
    setLoading(false);
  }

  function loadExample() {
    setPem(EXAMPLE_CERT);
    setError('');
    setCert(null);
  }

  function copyFp() {
    if (!cert) return;
    navigator.clipboard.writeText(cert.fingerprint).then(() => {
      setCopiedFp(true);
      setTimeout(() => setCopiedFp(false), 2000);
    });
  }

  function expiryColor(): string {
    if (!cert || cert.daysUntilExpiry === undefined) return '';
    if (cert.daysUntilExpiry < 0) return 'text-red-400';
    if (cert.daysUntilExpiry < 30) return 'text-yellow-400';
    return 'text-green-400';
  }

  function expiryLabel(): string {
    if (!cert) return '';
    if (cert.daysUntilExpiry < 0) return `Expired ${Math.abs(cert.daysUntilExpiry)} days ago`;
    if (cert.daysUntilExpiry < 30) return `Expiring in ${cert.daysUntilExpiry} days — renew soon!`;
    return `Valid for ${cert.daysUntilExpiry} more days`;
  }

  function formatDate(d: Date | null): string {
    if (!d) return 'N/A';
    return d.toUTCString();
  }

  return (
    <div class="space-y-6">
      {/* Input */}
      <div class="p-4 rounded-xl border border-border bg-surface">
        <div class="flex items-center justify-between mb-2">
          <label class="text-sm font-semibold">PEM Certificate</label>
          <button onClick={loadExample} class="text-xs px-3 py-1.5 rounded-lg bg-surface-alt border border-border text-text-muted hover:border-accent transition-colors">
            Load ISRG Root X1 Example
          </button>
        </div>
        <textarea
          value={pem}
          onInput={e => setPem((e.target as HTMLTextAreaElement).value)}
          rows={8}
          placeholder="-----BEGIN CERTIFICATE-----&#10;MIIFaz...&#10;-----END CERTIFICATE-----"
          class="w-full px-3 py-2 rounded-lg bg-surface-alt border border-border text-text text-sm font-mono focus:outline-none focus:ring-2 focus:ring-accent resize-y"
        />
        {error && <p class="mt-2 text-red-400 text-sm">{error}</p>}
        <button
          onClick={() => decode(pem)}
          disabled={loading}
          class="mt-3 px-5 py-2 rounded-lg bg-accent text-white text-sm font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? 'Decoding...' : 'Decode Certificate'}
        </button>
      </div>

      {/* Results */}
      {cert && (
        <div class="space-y-4">
          {/* Expiry banner */}
          <div class={`p-3 rounded-xl border ${cert.daysUntilExpiry < 0 ? 'border-red-500/40 bg-red-500/5' : cert.daysUntilExpiry < 30 ? 'border-yellow-500/40 bg-yellow-500/5' : 'border-green-500/40 bg-green-500/5'}`}>
            <span class={`font-semibold text-sm ${expiryColor()}`}>{expiryLabel()}</span>
          </div>

          {/* Subject / Issuer */}
          <div class="p-4 rounded-xl border border-border bg-surface space-y-3">
            <h3 class="text-sm font-semibold">Certificate Details</h3>
            <Row label="Subject" value={cert.subject || '(empty)'} mono />
            <Row label="Issuer" value={cert.issuer || '(empty)'} mono />
            <Row label="Serial Number" value={cert.serialNumber || 'N/A'} mono />
            <Row label="Signature Algorithm" value={cert.sigAlgorithm} />
            <Row label="Is CA" value={cert.isCA ? 'Yes (CA Certificate)' : 'No (End-Entity)'} />
          </div>

          {/* Validity */}
          <div class="p-4 rounded-xl border border-border bg-surface space-y-3">
            <h3 class="text-sm font-semibold">Validity Period</h3>
            <Row label="Not Before" value={formatDate(cert.notBefore)} mono />
            <Row label="Not After" value={formatDate(cert.notAfter)} mono />
            <div class="flex items-start gap-3">
              <span class="text-xs text-text-muted w-32 shrink-0 pt-0.5">Status</span>
              <span class={`text-sm font-medium ${expiryColor()}`}>{expiryLabel()}</span>
            </div>
          </div>

          {/* SANs */}
          {cert.sans.length > 0 && (
            <div class="p-4 rounded-xl border border-border bg-surface">
              <h3 class="text-sm font-semibold mb-3">Subject Alternative Names ({cert.sans.length})</h3>
              <div class="flex flex-wrap gap-2">
                {cert.sans.map((san, i) => (
                  <span key={i} class="px-2 py-1 rounded bg-surface-alt border border-border text-xs font-mono text-text">{san}</span>
                ))}
              </div>
            </div>
          )}

          {/* Key Usage */}
          {(cert.keyUsage.length > 0 || cert.extKeyUsage.length > 0) && (
            <div class="p-4 rounded-xl border border-border bg-surface space-y-3">
              <h3 class="text-sm font-semibold">Key Usage</h3>
              {cert.keyUsage.length > 0 && (
                <div>
                  <span class="text-xs text-text-muted block mb-1">Key Usage</span>
                  <div class="flex flex-wrap gap-2">
                    {cert.keyUsage.map((u, i) => (
                      <span key={i} class="px-2 py-1 rounded bg-accent/10 border border-accent/20 text-xs text-text">{u}</span>
                    ))}
                  </div>
                </div>
              )}
              {cert.extKeyUsage.length > 0 && (
                <div>
                  <span class="text-xs text-text-muted block mb-1">Extended Key Usage</span>
                  <div class="flex flex-wrap gap-2">
                    {cert.extKeyUsage.map((u, i) => (
                      <span key={i} class="px-2 py-1 rounded bg-accent/10 border border-accent/20 text-xs text-text">{u}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Fingerprint */}
          <div class="p-4 rounded-xl border border-border bg-surface">
            <div class="flex items-center justify-between mb-2">
              <h3 class="text-sm font-semibold">SHA-256 Fingerprint</h3>
              <button onClick={copyFp} class="text-xs px-3 py-1.5 rounded-lg bg-surface-alt border border-border hover:border-accent transition-colors">
                {copiedFp ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
            <code class="text-xs font-mono text-text-muted break-all">{cert.fingerprint}</code>
          </div>
        </div>
      )}

      <div class="p-4 rounded-xl bg-accent/5 border border-accent/20 text-sm">
        <p class="font-medium mb-1">Privacy note</p>
        <p class="text-text-muted text-xs">All decoding runs entirely in your browser using Web Crypto API and a pure JavaScript DER parser. No certificate data is sent to any server.</p>
      </div>
    </div>
  );
}

function Row({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div class="flex items-start gap-3">
      <span class="text-xs text-text-muted w-32 shrink-0 pt-0.5">{label}</span>
      <span class={`text-sm text-text break-all ${mono ? 'font-mono' : ''}`}>{value}</span>
    </div>
  );
}
