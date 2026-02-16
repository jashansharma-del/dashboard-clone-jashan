import type { ChartData } from "../../../../data/boardStorage";

export type PdfGraph = {
    type: "pie" | "bar" | "line";
    data: ChartData[];
};

const GRAPH_COLORS = [
    [59, 130, 246],
    [245, 158, 11],
    [16, 185, 129],
    [239, 68, 68],
    [139, 92, 246],
    [236, 72, 153],
];

function numberCmd(value: number): string {
    return Number.isFinite(value) ? value.toFixed(2) : "0";
}

function toPdfY(yFromTop: number, pageHeight: number): number {
    return pageHeight - yFromTop;
}

function wedgePath(
    centerX: number,
    centerY: number,
    radius: number,
    startAngle: number,
    endAngle: number
): string {
    const points: Array<{ x: number; y: number }> = [];
    const arc = Math.max(endAngle - startAngle, 0);
    const steps = Math.max(6, Math.ceil((arc / (Math.PI * 2)) * 36));
    for (let i = 0; i <= steps; i += 1) {
        const angle = startAngle + (arc * i) / steps;
        points.push({
            x: centerX + Math.cos(angle) * radius,
            y: centerY + Math.sin(angle) * radius,
        });
    }
    if (points.length === 0) return "";

    const commands = [
        `${numberCmd(centerX)} ${numberCmd(centerY)} m`,
        `${numberCmd(points[0].x)} ${numberCmd(points[0].y)} l`,
    ];
    for (let i = 1; i < points.length; i += 1) {
        commands.push(`${numberCmd(points[i].x)} ${numberCmd(points[i].y)} l`);
    }
    commands.push("h f");
    return commands.join("\n");
}

function renderBarGraph(graph: PdfGraph, pageWidth: number, pageHeight: number): string {
    const values = graph.data.map((item) => item.value);
    const maxValue = Math.max(...values, 1);
    const marginX = 64;
    const top = 120;
    const chartHeight = 560;
    const left = marginX;
    const width = pageWidth - marginX * 2;
    const count = Math.max(graph.data.length, 1);
    const gap = Math.max(6, width / (count * 4));
    const barWidth = (width - gap * (count + 1)) / count;
    const baseY = toPdfY(top + chartHeight, pageHeight);
    const cmds = ["1 1 1 rg", `${numberCmd(left)} ${numberCmd(baseY)} ${numberCmd(width)} ${numberCmd(chartHeight)} re f`];

    graph.data.forEach((item, index) => {
        const height = (Math.max(item.value, 0) / maxValue) * chartHeight;
        const x = left + gap + index * (barWidth + gap);
        const y = baseY;
        const [r, g, b] = GRAPH_COLORS[index % GRAPH_COLORS.length];
        cmds.push(`${numberCmd(r / 255)} ${numberCmd(g / 255)} ${numberCmd(b / 255)} rg`);
        cmds.push(`${numberCmd(x)} ${numberCmd(y)} ${numberCmd(barWidth)} ${numberCmd(height)} re f`);
    });

    return cmds.join("\n");
}

function renderLineGraph(graph: PdfGraph, pageWidth: number, pageHeight: number): string {
    const marginX = 64;
    const top = 120;
    const chartHeight = 560;
    const left = marginX;
    const width = pageWidth - marginX * 2;
    const maxValue = Math.max(...graph.data.map((item) => item.value), 1);
    const points = graph.data.map((item, index) => {
        const x = left + (width * index) / Math.max(graph.data.length - 1, 1);
        const yFromTop = top + chartHeight - (Math.max(item.value, 0) / maxValue) * chartHeight;
        return { x, y: toPdfY(yFromTop, pageHeight) };
    });
    if (points.length === 0) return "";

    const cmds = ["1 1 1 rg", `${numberCmd(left)} ${numberCmd(toPdfY(top + chartHeight, pageHeight))} ${numberCmd(width)} ${numberCmd(chartHeight)} re f`];
    cmds.push("0.231 0.510 0.965 RG");
    cmds.push("3 w");
    cmds.push(`${numberCmd(points[0].x)} ${numberCmd(points[0].y)} m`);
    for (let i = 1; i < points.length; i += 1) {
        cmds.push(`${numberCmd(points[i].x)} ${numberCmd(points[i].y)} l`);
    }
    cmds.push("S");

    points.forEach((point) => {
        const size = 4;
        cmds.push("0.231 0.510 0.965 rg");
        cmds.push(`${numberCmd(point.x - size)} ${numberCmd(point.y - size)} ${numberCmd(size * 2)} ${numberCmd(size * 2)} re f`);
    });
    return cmds.join("\n");
}

function renderPieGraph(graph: PdfGraph, pageWidth: number, pageHeight: number): string {
    const sum = graph.data.reduce((acc, item) => acc + Math.max(item.value, 0), 0);
    if (sum <= 0) return "";
    const cx = pageWidth / 2;
    const cy = pageHeight / 2;
    const radius = 220;
    let cursor = -Math.PI / 2;
    const cmds: string[] = [];

    graph.data.forEach((item, index) => {
        const portion = Math.max(item.value, 0) / sum;
        const next = cursor + portion * Math.PI * 2;
        const [r, g, b] = GRAPH_COLORS[index % GRAPH_COLORS.length];
        cmds.push(`${numberCmd(r / 255)} ${numberCmd(g / 255)} ${numberCmd(b / 255)} rg`);
        cmds.push(wedgePath(cx, cy, radius, cursor, next));
        cursor = next;
    });
    return cmds.join("\n");
}

export function buildGraphPdf(graphs: PdfGraph[]): Blob {
    const pageWidth = 612;
    const pageHeight = 842;
    const contentStreams = graphs.map((graph) => {
        switch (graph.type) {
            case "bar":
                return renderBarGraph(graph, pageWidth, pageHeight);
            case "line":
                return renderLineGraph(graph, pageWidth, pageHeight);
            case "pie":
            default:
                return renderPieGraph(graph, pageWidth, pageHeight);
        }
    });

    const objects: string[] = [];
    objects.push("<< /Type /Catalog /Pages 2 0 R >>");

    const pageObjectNumbers: number[] = [];
    const contentObjectNumbers: number[] = [];
    let nextObjectNumber = 3;

    for (let i = 0; i < contentStreams.length; i += 1) {
        const pageObjectNumber = nextObjectNumber;
        const contentObjectNumber = nextObjectNumber + 1;
        pageObjectNumbers.push(pageObjectNumber);
        contentObjectNumbers.push(contentObjectNumber);
        nextObjectNumber += 2;
    }

    const kids = pageObjectNumbers.map((num) => `${num} 0 R`).join(" ");
    objects.push(`<< /Type /Pages /Kids [${kids}] /Count ${pageObjectNumbers.length} >>`);

    for (let i = 0; i < pageObjectNumbers.length; i += 1) {
        objects.push(
            `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${contentObjectNumbers[i]} 0 R >>`
        );
        const stream = contentStreams[i];
        objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
    }

    let pdf = "%PDF-1.4\n";
    const offsets: number[] = [0];
    objects.forEach((obj, index) => {
        offsets.push(pdf.length);
        pdf += `${index + 1} 0 obj\n${obj}\nendobj\n`;
    });

    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n`;
    pdf += "0000000000 65535 f \n";
    offsets.slice(1).forEach((offset) => {
        pdf += `${offset.toString().padStart(10, "0")} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return new Blob([pdf], { type: "application/pdf" });
}

export function sanitizeGraphData(input: unknown): ChartData[] {
    if (!Array.isArray(input)) return [];
    return input
        .map((item) => {
            if (!item || typeof item !== "object") return null;
            const label = typeof (item as { label?: unknown }).label === "string" ? (item as { label: string }).label : "";
            const valueRaw = (item as { value?: unknown }).value;
            const value = typeof valueRaw === "number" ? valueRaw : Number(valueRaw);
            if (!Number.isFinite(value)) return null;
            return { label, value };
        })
        .filter((item): item is ChartData => Boolean(item));
}
