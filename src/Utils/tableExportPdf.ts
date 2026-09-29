import type { TableExportData } from './tableExportTypes'

/** Break points in source pixels so a page never starts or ends in the middle of a row. */
export function rowPageBreaks(rowTops: number[], rowHeights: number[], pageHeight: number, totalHeight: number): number[] {
  const breaks = [0]
  let pageStart = 0
  for (let i = 0; i < rowTops.length; i += 1) {
    const top = rowTops[i] ?? 0
    const bottom = top + (rowHeights[i] ?? 0)
    if (bottom - pageStart > pageHeight && top > pageStart + 1) {
      breaks.push(top)
      pageStart = top
    }
  }
  if ((breaks[breaks.length - 1] ?? 0) < totalHeight) breaks.push(totalHeight)
  return breaks
}

function sanitizeFilename(name: string): string {
  return name.replace(/[<>:"/\\|?*]+/g, '_').trim() || 'export'
}

function buildPrintableTableHtml(title: string, data: TableExportData, rtl: boolean): HTMLElement {
  const wrapper = document.createElement('div')
  wrapper.dir = rtl ? 'rtl' : 'ltr'
  wrapper.style.cssText =
    'position:fixed;left:-12000px;top:0;width:1200px;padding:20px;background:#ffffff;color:#111827;font-family:Segoe UI,Tahoma,Arial,sans-serif;font-size:11px;line-height:1.4'

  const heading = document.createElement('h1')
  heading.textContent = title
  heading.style.cssText = 'margin:0 0 14px;font-size:18px;font-weight:700'
  wrapper.appendChild(heading)

  if (data.summary && data.summary.headers.length > 0) {
    const summaryTitle = document.createElement('h2')
    summaryTitle.textContent = data.summary.title
    summaryTitle.style.cssText = 'margin:0 0 8px;font-size:14px;font-weight:700'
    wrapper.appendChild(summaryTitle)

    const summary = document.createElement('table')
    summary.style.cssText = 'width:auto;border-collapse:collapse;margin:0 0 18px'
    const summaryHead = document.createElement('tr')
    const summaryBody = document.createElement('tr')
    data.summary.headers.forEach((header, index) => {
      const th = document.createElement('th')
      th.textContent = header
      th.style.cssText =
        'border:1px solid #cbd5e1;padding:6px 12px;background:#e0f2fe;font-weight:700;text-align:center;white-space:nowrap'
      summaryHead.appendChild(th)
      const td = document.createElement('td')
      td.textContent = String(data.summary?.values[index] ?? '')
      td.style.cssText =
        'border:1px solid #e2e8f0;padding:6px 12px;text-align:center;font-weight:700;white-space:nowrap'
      summaryBody.appendChild(td)
    })
    summary.appendChild(summaryHead)
    summary.appendChild(summaryBody)
    wrapper.appendChild(summary)
  }

  const table = document.createElement('table')
  table.style.cssText = 'width:100%;border-collapse:collapse'

  const thead = document.createElement('thead')
  const headRow = document.createElement('tr')
  for (const h of data.headers) {
    const th = document.createElement('th')
    th.textContent = h
    th.style.cssText = 'border:1px solid #cbd5e1;padding:6px 8px;background:#f1f5f9;font-weight:700;text-align:center'
    headRow.appendChild(th)
  }
  thead.appendChild(headRow)
  table.appendChild(thead)

  const tbody = document.createElement('tbody')
  for (const row of data.rows) {
    const tr = document.createElement('tr')
    for (const cell of row) {
      const td = document.createElement('td')
      td.textContent = cell
      td.style.cssText =
        'border:1px solid #e2e8f0;padding:5px 8px;text-align:center;vertical-align:middle;white-space:pre-line'
      tr.appendChild(td)
    }
    tbody.appendChild(tr)
  }
  table.appendChild(tbody)
  wrapper.appendChild(table)
  return wrapper
}

export async function renderTablePdf(
  data: TableExportData,
  filename: string,
  title: string,
  rtl = true
): Promise<void> {
  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([import('jspdf'), import('html2canvas')])
  const wrapper = buildPrintableTableHtml(title, data, rtl)
  document.body.appendChild(wrapper)

  try {
    const canvas = await html2canvas(wrapper, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
    const landscape = data.headers.length > 5
    const pdf = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' })
    const margin = 10
    const pageWidth = pdf.internal.pageSize.getWidth() - margin * 2
    const pageHeight = pdf.internal.pageSize.getHeight() - margin * 2
    const scale = canvas.width / Math.max(wrapper.offsetWidth, 1)
    const sliceHeight = (pageHeight / pageWidth) * canvas.width
    const origin = wrapper.getBoundingClientRect().top
    const rows = [...wrapper.querySelectorAll('tr')]
    const breaks = rowPageBreaks(
      rows.map(row => (row.getBoundingClientRect().top - origin) * scale),
      rows.map(row => row.getBoundingClientRect().height * scale),
      sliceHeight,
      canvas.height
    )

    for (let page = 0; page < breaks.length - 1; page += 1) {
      const start = Math.max(0, Math.floor(breaks[page] ?? 0))
      const end = Math.min(canvas.height, Math.ceil(breaks[page + 1] ?? canvas.height))
      const slicePx = Math.max(1, end - start)
      const pageCanvas = document.createElement('canvas')
      pageCanvas.width = canvas.width
      pageCanvas.height = slicePx
      const ctx = pageCanvas.getContext('2d')
      if (!ctx) continue
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height)
      ctx.drawImage(canvas, 0, start, canvas.width, slicePx, 0, 0, canvas.width, slicePx)
      if (page > 0) pdf.addPage()
      const sliceMm = (slicePx * pageWidth) / canvas.width
      pdf.addImage(pageCanvas.toDataURL('image/png'), 'PNG', margin, margin, pageWidth, sliceMm)
    }

    pdf.save(`${sanitizeFilename(filename)}.pdf`)
  } finally {
    document.body.removeChild(wrapper)
  }
}
