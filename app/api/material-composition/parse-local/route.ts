// 소재구성 PDF를 로컬 Next 서버에서 텍스트 추출해 광물 함량으로 변환하는 API입니다.
import { NextResponse } from 'next/server';
import path from 'path';
import { pathToFileURL } from 'url';

export const runtime = 'nodejs';

function pickMaterialNumber(text: string, patterns: RegExp[]): number | null {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (!match?.[1]) continue;
    const value = Number(match[1].replace(',', '.'));
    if (Number.isFinite(value)) return value;
  }
  return null;
}

async function extractTextFromPdf(file: File): Promise<string> {
  const importRuntime = new Function('specifier', 'return import(specifier)') as (specifier: string) => Promise<typeof import('pdfjs-dist/legacy/build/pdf.mjs')>;
  const pdfjsPath = pathToFileURL(path.join(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.mjs')).href;
  const pdfjs = await importRuntime(pdfjsPath);
  const data = new Uint8Array(await file.arrayBuffer());
  const task = pdfjs.getDocument({
    data,
    disableWorker: true,
    isEvalSupported: false,
    standardFontDataUrl: 'node_modules/pdfjs-dist/standard_fonts/',
  } as Parameters<typeof pdfjs.getDocument>[0]);
  const pdf = await task.promise;
  const pages: string[] = [];
  for (let pageNo = 1; pageNo <= pdf.numPages; pageNo += 1) {
    const page = await pdf.getPage(pageNo);
    const textContent = await page.getTextContent();
    pages.push(textContent.items.map(item => ('str' in item ? item.str : '')).join(' '));
  }
  return pages.join('\n');
}

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) {
      return NextResponse.json({ detail: 'file is required' }, { status: 400 });
    }

    const supplierId = String(form.get('supplierId') ?? '');
    const s3Key = String(form.get('s3Key') ?? '');
    const documentUrl = form.get('documentUrl') ? String(form.get('documentUrl')) : null;
    const rawText = await extractTextFromPdf(file);
    const text = rawText.replace(/\s+/g, ' ');
    const mineralText = text.match(/2\.\s*핵심광물 함량(?<body>.*?)(?:3\.\s*비고|$)/)?.groups?.body ?? text;
    const specs: Array<[string, RegExp[]]> = [
      ['li_content', [/(?:^|[^A-Za-z])Li\s*\([^)]*\)[^0-9]{0,120}(\d+(?:[.,]\d+)?)/i, /리튬\)?[^0-9]{0,120}(\d+(?:[.,]\d+)?)/]],
      ['co_content', [/(?:^|[^A-Za-z])Co\s*\([^)]*\)[^0-9]{0,120}(\d+(?:[.,]\d+)?)/i, /코발트\)?[^0-9]{0,120}(\d+(?:[.,]\d+)?)/]],
      ['ni_content', [/(?:^|[^A-Za-z])Ni\s*\([^)]*\)[^0-9]{0,120}(\d+(?:[.,]\d+)?)/i, /니켈\)?[^0-9]{0,120}(\d+(?:[.,]\d+)?)/]],
      ['mn_content', [/(?:^|[^A-Za-z])Mn\s*\([^)]*\)[^0-9]{0,120}(\d+(?:[.,]\d+)?)/i, /망간\)?[^0-9]{0,120}(\d+(?:[.,]\d+)?)/]],
      ['natural_graphite_content', [/(?:천연흑연|Natural Graphite)\)?[^0-9]{0,120}(\d+(?:[.,]\d+)?)/i]],
      ['artificial_graphite_content', [/(?:인조흑연|Artificial Graphite|Synthetic Graphite)\)?[^0-9]{0,120}(\d+(?:[.,]\d+)?)/i]],
    ];

    const parsedFields: Record<string, number> = {};
    const confidenceMap: Record<string, number> = {};
    for (const [key, patterns] of specs) {
      const value = pickMaterialNumber(mineralText, patterns);
      if (value == null) continue;
      parsedFields[key] = value;
      confidenceMap[key] = 0.9;
    }

    return NextResponse.json({
      requestId: `local-material-${s3Key || file.name}`,
      supplierId,
      supplierName: null,
      requestedDataType: '소재구성 문서',
      submissionStatus: 'review',
      parsedFields,
      confidenceMap,
      unparsedFields: [],
      blankFields: specs.map(([key]) => key).filter(key => parsedFields[key] == null),
      unreadableFields: [],
      docCategory: 'material_composition',
      docS3Key: s3Key || null,
      documentUrl,
      documentFileName: file.name,
    });
  } catch (error) {
    return NextResponse.json(
      { detail: error instanceof Error ? error.message : 'material composition parse failed' },
      { status: 500 },
    );
  }
}
