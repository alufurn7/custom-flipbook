from pathlib import Path

from reportlab.lib.colors import HexColor
from reportlab.lib.pagesizes import A4
from reportlab.pdfgen.canvas import Canvas


OUTPUT = Path(__file__).resolve().parents[1] / "outputs" / "pdf-adapter-sample.pdf"
WIDTH, HEIGHT = A4


def footer(canvas: Canvas, page: int) -> None:
    canvas.setFillColor(HexColor("#607077"))
    canvas.setFont("Helvetica", 9)
    canvas.drawString(48, 34, "PAPERFOLD PDF ADAPTER SAMPLE")
    canvas.drawRightString(WIDTH - 48, 34, str(page))


OUTPUT.parent.mkdir(parents=True, exist_ok=True)
pdf = Canvas(str(OUTPUT), pagesize=A4, pageCompression=1)
pdf.setTitle("Paperfold PDF Adapter Sample")

pdf.setFillColor(HexColor("#10343E"))
pdf.rect(0, 0, WIDTH, HEIGHT, fill=1, stroke=0)
pdf.setFillColor(HexColor("#F1C46B"))
pdf.setFont("Helvetica-Bold", 12)
pdf.drawString(48, HEIGHT - 62, "PAPERFOLD - PDF.JS")
pdf.setFillColor(HexColor("#F8F4EA"))
pdf.setFont("Helvetica-Bold", 42)
pdf.drawString(48, HEIGHT - 142, "Rendered pages")
pdf.drawString(48, HEIGHT - 190, "that still fold")
pdf.setFillColor(HexColor("#D45D48"))
pdf.rect(48, HEIGHT - 222, 72, 5, fill=1, stroke=0)
pdf.setFillColor(HexColor("#E6ECE9"))
pdf.setFont("Helvetica", 15)
pdf.drawString(48, HEIGHT - 270, "A deterministic two-page fixture for the adapter smoke test.")
pdf.setFillColor(HexColor("#D45D48"))
pdf.circle(WIDTH - 118, 150, 105, fill=1, stroke=0)
footer(pdf, 1)
pdf.showPage()

pdf.setFillColor(HexColor("#F7F2E8"))
pdf.rect(0, 0, WIDTH, HEIGHT, fill=1, stroke=0)
pdf.setFillColor(HexColor("#BE4F3A"))
pdf.setFont("Helvetica-Bold", 11)
pdf.drawString(48, HEIGHT - 62, "LAZY RASTERIZATION")
pdf.setFillColor(HexColor("#17313A"))
pdf.setFont("Helvetica-Bold", 34)
pdf.drawString(48, HEIGHT - 122, "One source, many live clones")
pdf.setStrokeColor(HexColor("#B8C5C2"))
pdf.line(48, HEIGHT - 148, WIDTH - 48, HEIGHT - 148)
pdf.setFont("Helvetica", 14)
lines = [
    "PDF.js rasterizes a page only when the cache requests it.",
    "Mounted copies share the same image URL, so folded surfaces remain sharp.",
    "Eviction revokes the URL and releases the cached rendering resource.",
]
for index, line in enumerate(lines):
    pdf.drawString(48, HEIGHT - 200 - index * 34, line)
pdf.setFillColor(HexColor("#1E6873"))
pdf.roundRect(48, 150, WIDTH - 96, 210, 18, fill=1, stroke=0)
pdf.setFillColor(HexColor("#FFFFFF"))
pdf.setFont("Helvetica-Bold", 24)
pdf.drawString(78, 306, "Render -> cache -> clone -> dispose")
pdf.setFont("Helvetica", 13)
pdf.drawString(78, 270, "The engine remains framework-independent throughout the pipeline.")
footer(pdf, 2)
pdf.save()

print(OUTPUT)
