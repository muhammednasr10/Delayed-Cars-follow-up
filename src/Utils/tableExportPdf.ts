import type { TableExportData } from './tableExportTypes'

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
      td.style.cssText = 'border:1px solid #e2e8f0;padding:5px 8px;text-align:center;vertical-align:middle'
      tr.appendChild(td)
    }
    tbody.appendChild(tr)
  }
  table.appendChild(tbody)
  wrapper.appendChild(table)
  return wrapper
}

export async function renderTablePdf(data: TableExportData, filename: string, title: string, rtl = true): Promise<void> {
  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([import('jspdf'), import('html2canvas')])
  const wrapper = buildPrintableTableHtml(title, data, rtl)
  document.body.appendChild(wrapper)

  try {
    const canvas = await html2canvas(wrapper, { scale: 2, backgroundColor: '#ffffff', useCORS: true })
    const imgData = canvas.toDataURL('image/png')
    const landscape = data.headers.length > 5
    const pdf = new jsPDF({ orientation: landscape ? 'landscape' : 'portrait', unit: 'mm', format: 'a4' })
    const margin = 10
    const pageWidth = pdf.internal.pageSize.getWidth() - margin * 2
    const pageHeight = pdf.internal.pageSize.getHeight() - margin * 2
    const imgHeight = (canvas.height * pageWidth) / canvas.width

    let offsetY = 0
    let page = 0

    while (offsetY < imgHeight) {
      if (page > 0) pdf.addPage()
      pdf.addImage(imgData, 'PNG', margin, margin - offsetY, pageWidth, imgHeight)
      offsetY += pageHeight
      page += 1
    }

    pdf.save(`${sanitizeFilename(filename)}.pdf`)
  } finally {
    document.body.removeChild(wrapper)
  }
}
