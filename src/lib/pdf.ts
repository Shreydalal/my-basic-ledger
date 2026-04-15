import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

export interface ReportColumn {
    key: string;
    label: string;
}

export interface ReportConfig<T> {
    title: string;
    subtitle?: string;
    filename: string;
    data: T[];
    columns: ReportColumn[];
    metrics?: { label: string; value: string }[];
}

export function exportToPDF<T extends Record<string, any>>(config: ReportConfig<T>) {
    const doc = new jsPDF();

    const BRAND_COLOR: [number, number, number] = [0, 107, 95];
    const TEXT_PRIMARY: [number, number, number] = [15, 23, 42];
    
    // Helper to sanitize unsupported Rupee unicode characters
    const sanitizeText = (txt: string) => txt.replace(/₹/g, 'Rs. ');

    // Header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.setTextColor(...BRAND_COLOR);
    doc.text(sanitizeText(config.title), 14, 22);

    if (config.subtitle) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 116, 139);
        doc.text(sanitizeText(config.subtitle), 14, 30);
    }

    let startY = 40;

    // Metrics Box
    if (config.metrics && config.metrics.length > 0) {
        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(14, startY, 182, 25, 3, 3, "FD");

        let currentX = 20;
        config.metrics.forEach((metric) => {
            doc.setFontSize(9);
            doc.setFont("helvetica", "normal");
            doc.setTextColor(100, 116, 139);
            doc.text(sanitizeText(metric.label.toUpperCase()), currentX, startY + 10);

            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            if (metric.label.toLowerCase().includes("pending") && parseFloat(metric.value.replace(/[^0-9.-]+/g,"")) > 0) {
                doc.setTextColor(155, 68, 38);
            } else {
                doc.setTextColor(...TEXT_PRIMARY);
            }
            doc.text(sanitizeText(metric.value), currentX, startY + 18);

            currentX += 60;
        });
        startY += 35;
    }

    const tableHeaders = config.columns.map(c => sanitizeText(c.label));
    const tableData = config.data.map(item => config.columns.map(c => {
        const val = item[c.key];
        const strVal = val === undefined || val === null ? "" : String(val);
        return sanitizeText(strVal);
    }));

    autoTable(doc, {
        startY: startY,
        head: [tableHeaders],
        body: tableData,
        theme: 'striped',
        headStyles: {
            fillColor: [241, 245, 249],
            textColor: [71, 85, 105],
            fontSize: 10,
            fontStyle: 'bold',
            halign: 'left',
        },
        bodyStyles: {
            textColor: TEXT_PRIMARY,
            fontSize: 10,
            cellPadding: 4,
        },
        alternateRowStyles: {
            fillColor: [252, 252, 252],
        },
        margin: { left: 14, right: 14, bottom: 20 },
    });

    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text(
            `Generated on ${new Date().toLocaleString()} - Page ${i} of ${pageCount}`,
            14,
            doc.internal.pageSize.height - 10
        );
    }

    doc.save(`${config.filename}.pdf`);
}
