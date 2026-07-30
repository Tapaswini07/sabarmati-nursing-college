from reportlab.lib.pagesizes import A4
from reportlab.pdfgen import canvas
from reportlab.lib.utils import ImageReader

out = r"C:\Users\KIIT0001\Desktop\sabarmati file\sabarmati project real 2.17\sabarmati project real 2\tmp\pdfs\payslip-layout-preview.pdf"
background = r"C:\Users\KIIT0001\Desktop\sabarmati file\sabarmati project real 2.17\sabarmati project real 2\frontend\public\college-letter-head.jpg"
c = canvas.Canvas(out, pagesize=A4)
w, h = A4
c.drawImage(ImageReader(background), 0, 0, width=w, height=h)

def text(value, x, y, size=8, bold=False, align="left"):
    c.setFont("Helvetica-Bold" if bold else "Helvetica", size)
    if align == "right": c.drawRightString(x, y, value)
    elif align == "center": c.drawCentredString(x, y, value)
    else: c.drawString(x, y, value)

def table(x, top, width, title, rows, total_label, total):
    title_h, row_h, total_h = 17, 18, 25
    height = title_h + len(rows) * row_h + total_h
    bottom = top - height
    divider = x + width * .61
    c.rect(x, bottom, width, height)
    c.line(x, top - title_h, x + width, top - title_h)
    c.line(divider, top - title_h, divider, bottom)
    text(title, x + width / 2, top - 12, 8.5, True, "center")
    for index, (label, value) in enumerate(rows):
        y = top - title_h - row_h * (index + 1)
        c.line(x, y, x + width, y)
        text(label, x + 6, y + 6, 8)
        text(value, x + width - 6, y + 6, 8, False, "right")
    total_y = bottom + 9
    text(total_label, divider - 4, total_y, 8.4, True, "right")
    text(total, x + width - 6, total_y, 8.4, True, "right")

text("Date: 01 Jun 2026", 544, 690, 9, False, "right")
text("SALARY STATEMENT", 298, 645, 14, True, "center")
text("Signature of employee: __________________________", 544, 625, 8.5, False, "right")
text("This is to certify that Mrs. Sanghamitra Barik, Staff ID 2018-95, is a permanent employee of", 52, 590, 8.5)
text("Sabarmati College of Nursing. The following is the salary statement for May 2026.", 52, 578, 8.5)
table(52, 526, 233, "GROSS SALARY (Rs.)", [("Basic Pay", "Rs. 80,000"), ("Allowances", "Rs. 0"), ("Overtime", "Rs. 0"), ("Bonus", "Rs. 0"), ("Other Earnings", "Rs. 0")], "Gross Salary (1)", "Rs. 80,000")
table(312, 526, 233, "DEDUCTIONS (Rs.)", [("EPF", "Rs. 0"), ("Insurance / ESI", "Rs. 0"), ("TDS", "Rs. 8,000"), ("Advance", "Rs. 0"), ("Others", "Rs. 0")], "Total Deduction (2)", "Rs. 8,000")
c.rect(158, 351, 278, 28); c.line(342, 351, 342, 379)
text("NET SALARY (1-2)", 336, 361, 9, True, "right"); text("Rs. 72,000", 430, 361, 9, True, "right")
text("(Net Salary Rupees: Seventy Two Thousand only)", 52, 330, 8.5, True)
for i, (label, value) in enumerate([("Date of joining in the present employment", "01 Jan 2013"), ("Present designation", "Principal"), ("Department", "College"), ("Payment mode", "Bank Transfer")]):
    y = 295 - i * 25; text(label, 52, y, 8.5); text(":", 286, y, 8.5); text(value, 298, y, 8.5, True)
text("This salary statement is issued for official records.", 52, 178, 8.5)
c.line(52, 132, 220, 132); c.line(396, 132, 544, 132)
text("Prepared by Payroll & Accounts", 52, 116, 8.5, True); text("Authorised Signatory", 544, 116, 8.5, True, "right")
text("Place: Cuttack", 52, 82, 8.5); text("Date: 01 Jun 2026", 52, 67, 8.5); text("Office Stamp", 544, 82, 8.5, False, "right")
text("Computer-generated salary statement", 298, 32, 7.5, False, "center")
c.save()
