import json
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import cm
from reportlab.lib.enums import TA_CENTER
from datetime import datetime

# Level thresholds as defined in the system
level_thresholds = {
    1: 0,       # Nível 1 é o inicial (0 apostado)
    2: 50,      # R$50 para nível 2 (forçar primeiro upgrade)
    5: 150,     # R$150 (reduzido)
    10: 400,    # R$400 (bem mais baixo)
    20: 1200,   # R$1,200 (mais acessível)
    30: 3000,   # R$3,000 (reduzido)
    50: 8000,   # R$8,000 (bem mais baixo)
    70: 20000,  # R$20,000 (reduzido)
    100: 50000  # R$50,000 (muito mais alcançável)
}

def get_required_for_level(n):
    """Calculate required amount for any level"""
    if n in level_thresholds:
        return level_thresholds[n]
    
    # Exponential growth between reward levels
    reward_levels = [1, 2, 5, 10, 20, 30, 50, 70, 100]
    prev_reward_level = max([l for l in reward_levels if l < n], default=0)
    next_reward_level = min([l for l in reward_levels if l > n], default=100)
    
    if prev_reward_level <= 1:
        return 50 + (n - 2) * 33  # Levels 3-4 (progressão mais suave após nível 2)
    
    prev_required = level_thresholds[prev_reward_level]
    next_required = level_thresholds[next_reward_level]
    levels_between = next_reward_level - prev_reward_level
    position_between = n - prev_reward_level
    
    return int(prev_required + ((next_required - prev_required) / levels_between) * position_between)

def get_tier_name(level):
    """Get tier name for a given level"""
    if level < 2:
        return "Sem rank"
    elif level <= 24:
        return "Bronze"
    elif level <= 49:
        return "Prata"
    elif level <= 74:
        return "Ouro"
    elif level <= 99:
        return "Platina"
    else:
        return "Diamante"

def format_currency(value):
    """Format value as Brazilian currency"""
    return f"R$ {value:,.2f}".replace(",", "X").replace(".", ",").replace("X", ".")

def generate_pdf():
    """Generate PDF with level progression table"""
    
    # Create PDF document
    pdf_filename = "tabela-niveis-completa.pdf"
    doc = SimpleDocTemplate(pdf_filename, pagesize=A4, 
                           leftMargin=1*cm, rightMargin=1*cm,
                           topMargin=2*cm, bottomMargin=2*cm)
    
    # Container for the 'Flowable' objects
    elements = []
    
    # Define styles
    styles = getSampleStyleSheet()
    title_style = ParagraphStyle(
        'CustomTitle',
        parent=styles['Heading1'],
        fontSize=24,
        textColor=colors.HexColor('#00E880'),
        spaceAfter=30,
        alignment=TA_CENTER
    )
    
    subtitle_style = ParagraphStyle(
        'CustomSubtitle',
        parent=styles['Normal'],
        fontSize=12,
        textColor=colors.grey,
        spaceAfter=20,
        alignment=TA_CENTER
    )
    
    # Add title
    title = Paragraph("Tabela de Progressão de Níveis", title_style)
    elements.append(title)
    
    subtitle = Paragraph("Valores apostados necessários para cada nível (1-100)", subtitle_style)
    elements.append(subtitle)
    
    date_text = Paragraph(f"Gerado em: {datetime.now().strftime('%d/%m/%Y %H:%M')}", subtitle_style)
    elements.append(date_text)
    
    elements.append(Spacer(1, 20))
    
    # Calculate all level requirements
    level_data = []
    for level in range(1, 101):
        required = get_required_for_level(level)
        tier = get_tier_name(level)
        
        # Calculate difference from previous level
        if level == 1:
            diff = required
        else:
            prev_required = get_required_for_level(level - 1) if level > 1 else 0
            diff = required - prev_required
        
        level_data.append([
            str(level),
            tier,
            format_currency(required),
            format_currency(diff)
        ])
    
    # Create table with 25 rows per page
    rows_per_page = 25
    table_header = [['Nível', 'Rank', 'Valor Total Apostado', 'Diferença do Nível Anterior']]
    
    for i in range(0, len(level_data), rows_per_page):
        # Get chunk of data
        chunk = level_data[i:i+rows_per_page]
        
        # Create table
        table_data = table_header + chunk
        table = Table(table_data, colWidths=[2*cm, 3*cm, 5.5*cm, 5.5*cm])
        
        # Apply table style
        table_style = TableStyle([
            # Header
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#00E880')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('ALIGN', (0, 0), (-1, 0), 'CENTER'),
            
            # Body
            ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
            ('FONTSIZE', (0, 1), (-1, -1), 10),
            ('ALIGN', (0, 1), (0, -1), 'CENTER'),  # Level column
            ('ALIGN', (1, 1), (1, -1), 'CENTER'),  # Tier column
            ('ALIGN', (2, 1), (2, -1), 'RIGHT'),   # Total column
            ('ALIGN', (3, 1), (3, -1), 'RIGHT'),   # Difference column
            
            # Grid
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F5F5F5')]),
        ])
        
        # Color-code tiers
        for row_idx, row_data in enumerate(chunk, start=1):
            tier = row_data[1]
            if tier == "Sem rank":
                color = colors.grey
            elif tier == "Bronze":
                color = colors.HexColor('#D97706')
            elif tier == "Prata":
                color = colors.HexColor('#9CA3AF')
            elif tier == "Ouro":
                color = colors.HexColor('#EAB308')
            elif tier == "Platina":
                color = colors.HexColor('#6B7280')
            elif tier == "Diamante":
                color = colors.HexColor('#06B6D4')
            else:
                color = colors.black
            
            table_style.add('TEXTCOLOR', (1, row_idx), (1, row_idx), color)
            table_style.add('FONTNAME', (1, row_idx), (1, row_idx), 'Helvetica-Bold')
        
        table.setStyle(table_style)
        elements.append(table)
        
        # Add page break if not last chunk
        if i + rows_per_page < len(level_data):
            elements.append(PageBreak())
    
    # Add summary statistics
    elements.append(Spacer(1, 30))
    
    summary_title = Paragraph("Resumo por Rank", title_style)
    elements.append(summary_title)
    
    # Calculate tier summaries
    tier_summary = [
        ['Rank', 'Níveis', 'Valor Inicial', 'Valor Final'],
        ['Sem rank', '1', format_currency(0), format_currency(get_required_for_level(1))],
        ['Bronze', '2-24', format_currency(get_required_for_level(2)), format_currency(get_required_for_level(24))],
        ['Prata', '25-49', format_currency(get_required_for_level(25)), format_currency(get_required_for_level(49))],
        ['Ouro', '50-74', format_currency(get_required_for_level(50)), format_currency(get_required_for_level(74))],
        ['Platina', '75-99', format_currency(get_required_for_level(75)), format_currency(get_required_for_level(99))],
        ['Diamante', '100', format_currency(get_required_for_level(100)), format_currency(get_required_for_level(100))]
    ]
    
    summary_table = Table(tier_summary, colWidths=[3*cm, 3*cm, 5*cm, 5*cm])
    summary_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#00E880')),
        ('TEXTCOLOR', (0, 0), (-1, 0), colors.black),
        ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
        ('FONTSIZE', (0, 0), (-1, 0), 11),
        ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
        ('FONTNAME', (0, 1), (-1, -1), 'Helvetica'),
        ('FONTSIZE', (0, 1), (-1, -1), 10),
        ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#F5F5F5')]),
    ]))
    
    elements.append(summary_table)
    
    # Build PDF
    doc.build(elements)
    print(f"PDF gerado com sucesso: {pdf_filename}")
    
    # Also create a simplified markdown version for quick reference
    create_markdown_table()

def create_markdown_table():
    """Create a markdown version of the table"""
    
    with open("tabela-niveis-completa.md", "w", encoding="utf-8") as f:
        f.write("# Tabela de Progressão de Níveis\n\n")
        f.write("## Valores apostados necessários para cada nível (1-100)\n\n")
        f.write(f"*Gerado em: {datetime.now().strftime('%d/%m/%Y %H:%M')}*\n\n")
        
        # Summary by tier
        f.write("### Resumo por Rank\n\n")
        f.write("| Rank | Níveis | Valor Inicial | Valor Final |\n")
        f.write("|------|--------|---------------|-------------|\n")
        f.write(f"| Sem rank | 1 | R$ 0,00 | {format_currency(get_required_for_level(1))} |\n")
        f.write(f"| Bronze | 2-24 | {format_currency(get_required_for_level(2))} | {format_currency(get_required_for_level(24))} |\n")
        f.write(f"| Prata | 25-49 | {format_currency(get_required_for_level(25))} | {format_currency(get_required_for_level(49))} |\n")
        f.write(f"| Ouro | 50-74 | {format_currency(get_required_for_level(50))} | {format_currency(get_required_for_level(74))} |\n")
        f.write(f"| Platina | 75-99 | {format_currency(get_required_for_level(75))} | {format_currency(get_required_for_level(99))} |\n")
        f.write(f"| Diamante | 100 | {format_currency(get_required_for_level(100))} | {format_currency(get_required_for_level(100))} |\n\n")
        
        # Full table
        f.write("### Tabela Completa\n\n")
        f.write("| Nível | Rank | Valor Total Apostado | Diferença do Nível Anterior |\n")
        f.write("|-------|------|---------------------|-----------------------------|\n")
        
        for level in range(1, 101):
            required = get_required_for_level(level)
            tier = get_tier_name(level)
            
            if level == 1:
                diff = required
            else:
                prev_required = get_required_for_level(level - 1)
                diff = required - prev_required
            
            f.write(f"| {level} | {tier} | {format_currency(required)} | {format_currency(diff)} |\n")
    
    print("Markdown gerado com sucesso: tabela-niveis-completa.md")

if __name__ == "__main__":
    generate_pdf()