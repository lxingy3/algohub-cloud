import { jsPDF } from 'jspdf';

/** @type {Record<string, [number, number, number]>} */
const COLORS = {
  gold: [180, 112, 18],
  ink: [25, 28, 32],
  muted: [80, 91, 104],
  rule: [196, 202, 209],
  wash: [242, 243, 244],
  white: [255, 255, 255],
};

export function createBriefingPdf(briefing) {
  if (!briefing?.title || !briefing?.slug) throw new Error('A briefing title and slug are required.');

  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
    putOnlyUsedFonts: true,
  });
  doc.setProperties({
    title: pdfText(briefing.title),
    subject: 'Reviewed public AlgoStories briefing',
    author: 'AlgoStories',
    creator: 'AlgoStories briefing PDF export',
    keywords: `AlgoStories, briefing, ${pdfText(briefing.slug)}`,
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 19;
  const contentWidth = pageWidth - marginX * 2;
  const top = 20;
  const bottom = pageHeight - 18;
  const bodySize = 11;
  const bodyLeading = 5.7;
  const publishedDate = metadataValue(briefing.metadata, 'Published') || 'Publication date not listed';
  let y = top;

  const addPage = () => {
    doc.addPage('a4', 'portrait');
    y = top;
  };

  const ensureSpace = (height) => {
    if (y + height > bottom) addPage();
  };

  const split = (value, width, fontSize = bodySize, style = 'normal', family = 'helvetica') => {
    doc.setFont(family, style);
    doc.setFontSize(fontSize);
    return doc.splitTextToSize(pdfText(value), Math.max(width, 12));
  };

  const writeLines = (lines, {
    x = marginX,
    width = contentWidth,
    fontSize = bodySize,
    lineHeight = bodyLeading,
    family = 'helvetica',
    style = 'normal',
    color = COLORS.ink,
  } = {}) => {
    let index = 0;
    while (index < lines.length) {
      ensureSpace(lineHeight);
      const capacity = Math.max(1, Math.floor((bottom - y) / lineHeight));
      const chunk = lines.slice(index, index + capacity);
      doc.setFont(family, style);
      doc.setFontSize(fontSize);
      doc.setTextColor(...color);
      chunk.forEach((line, lineIndex) => doc.text(line, x, y + lineIndex * lineHeight));
      y += chunk.length * lineHeight;
      index += chunk.length;
      if (index < lines.length) addPage();
    }
    return width;
  };

  const writeParagraph = (value, options = {}) => {
    const fontSize = options.fontSize || bodySize;
    const family = options.family || 'helvetica';
    const style = options.style || 'normal';
    const width = options.width || contentWidth;
    const lines = split(value, width, fontSize, style, family);
    return writeLines(lines.length ? lines : [''], { ...options, width, fontSize, family, style });
  };

  const sectionHeading = (title, continued = false, minFollowing = 0) => {
    ensureSpace(20 + minFollowing);
    if (y > top) y += 7;
    doc.setFont('times', 'bold');
    doc.setFontSize(17);
    doc.setTextColor(...COLORS.ink);
    doc.text(`${pdfText(title)}${continued ? ' (continued)' : ''}`, marginX, y);
    y += 4;
    doc.setDrawColor(...COLORS.rule);
    doc.setLineWidth(0.25);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 8;
  };

  drawOpening();
  drawMetadata();

  const readingNote = pdfText(briefing.patternAnalysis || '');
  const summary = dedupeSentences(briefing.executiveSummary || 'No executive summary was provided.');
  if (readingNote && !sameText(readingNote, summary) && !normalizeText(summary).includes(normalizeText(readingNote))) {
    sectionHeading('Reading note');
    writeParagraph(readingNote, { color: COLORS.muted });
  }

  drawNumberedSection('Key findings', briefing.keyFindings || [], '');
  drawNumberedSection('Recommendations', briefing.recommendations || [], 'R');
  drawClaims(briefing.claimGroups || []);
  drawSilenceTable(briefing.silenceRows || []);
  drawProvenance(briefing.provenance || []);
  drawPageFurniture();
  return doc;

  function drawOpening() {
    doc.setFillColor(...COLORS.gold);
    doc.rect(0, 0, pageWidth, 4, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(...COLORS.ink);
    doc.text('ALGOSTORIES', marginX, 14);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...COLORS.muted);
    doc.text(`Public briefing | ${publishedDate}`, pageWidth - marginX, 14, { align: 'right' });
    doc.setDrawColor(...COLORS.rule);
    doc.setLineWidth(0.25);
    doc.line(marginX, 18, pageWidth - marginX, 18);

    y = 29;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(...COLORS.gold);
    doc.text(pdfText(briefing.subject || 'Cross-cutting corpus'), marginX, y);
    y += 8;

    let titleSize = 27;
    let titleLines = split(briefing.title, contentWidth, titleSize, 'bold', 'times');
    while (titleLines.length > 4 && titleSize > 21) {
      titleSize -= 1;
      titleLines = split(briefing.title, contentWidth, titleSize, 'bold', 'times');
    }
    const titleLeading = titleSize * 0.42;
    doc.setFont('times', 'bold');
    doc.setFontSize(titleSize);
    doc.setTextColor(...COLORS.ink);
    titleLines.forEach((line, index) => doc.text(line, marginX, y + index * titleLeading));
    y += titleLines.length * titleLeading + 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.muted);
    doc.text(pdfText(briefing.type || 'Briefing'), marginX, y);
    y += 10;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(...COLORS.ink);
    doc.text('Executive summary', marginX, y);
    y += 7;
    writeParagraph(dedupeSentences(briefing.executiveSummary || 'No executive summary was provided.'));
    y += 4;
  }

  function drawMetadata() {
    const rows = (briefing.metadata || [])
      .filter((item) => normalizeText(item.label) !== 'generated by')
      .slice(0, 6);
    if (!rows.length) return;
    ensureSpace(24);
    doc.setDrawColor(...COLORS.rule);
    doc.line(marginX, y, pageWidth - marginX, y);
    y += 7;

    const gap = 9;
    const columnWidth = (contentWidth - gap) / 2;
    for (let start = 0; start < rows.length; start += 2) {
      const pair = rows.slice(start, start + 2).map((item) => ({
        ...item,
        valueLines: split(item.value, columnWidth, 9.5),
      }));
      const rowHeight = Math.max(14, ...pair.map((item) => 7 + item.valueLines.length * 4.6));
      ensureSpace(rowHeight);
      pair.forEach((item, index) => {
        const x = marginX + index * (columnWidth + gap);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...COLORS.muted);
        doc.text(pdfText(item.label), x, y);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(...COLORS.ink);
        item.valueLines.forEach((line, lineIndex) => doc.text(line, x, y + 5.2 + lineIndex * 4.6));
      });
      y += rowHeight;
    }
    doc.line(marginX, y - 2, pageWidth - marginX, y - 2);
    y += 2;
  }

  function drawNumberedSection(title, items, prefix) {
    if (!items.length) return;
    sectionHeading(title, false, 16);
    items.forEach((item, index) => {
      const text = cleanListPrefix(item);
      const number = `${prefix}${index + 1}`;
      const lines = split(text, contentWidth - 15);
      const itemHeight = Math.max(bodyLeading, lines.length * bodyLeading) + 5;
      if (y + Math.min(itemHeight, bodyLeading * 3) > bottom) {
        addPage();
        doc.setFont('times', 'bold');
        doc.setFontSize(13);
        doc.setTextColor(...COLORS.ink);
        doc.text(`${title} (continued)`, marginX, y);
        y += 9;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8.5);
      doc.setTextColor(...COLORS.gold);
      doc.text(number, marginX, y);
      writeLines(lines, { x: marginX + 15, width: contentWidth - 15 });
      y += 5;
    });
  }

  function drawClaims(groups) {
    if (!groups.length) return;
    sectionHeading('Claims and reported experience', false, 24);
    groups.forEach((group, groupIndex) => {
      ensureSpace(24);
      if (groupIndex) {
        doc.setDrawColor(...COLORS.rule);
        doc.line(marginX, y, pageWidth - marginX, y);
        y += 7;
      }
      doc.setFont('times', 'bold');
      doc.setFontSize(13.5);
      doc.setTextColor(...COLORS.ink);
      doc.text(pdfText(group.name || `Evidence group ${groupIndex + 1}`), marginX, y);
      y += 5;
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...COLORS.muted);
      const groupMeta = [`${Number(group.experienceCount || 0)} related experience records`];
      if (group.examples?.length) groupMeta.push(`${group.examples.length} selected examples shown`);
      groupMeta.push(group.matchMethod || 'Briefing evidence match');
      doc.text(
        fitToWidth(doc, groupMeta.join(' | '), contentWidth),
        marginX,
        y,
      );
      y += 8;

      (group.claims || []).forEach((claim, index) => {
        drawEvidenceRow(`Claim ${index + 1}`, claim.text, claim.source ? `Source: ${claim.source}` : '', group.name);
      });
      (group.examples || []).forEach((example, index) => {
        drawEvidenceRow(`Experience ${index + 1}`, example.title, example.impact ? `Reported impact: ${example.impact}` : '', group.name);
      });
      y += 3;
    });
  }

  function drawEvidenceRow(label, value, note, groupName) {
    const labelWidth = 31;
    const textWidth = contentWidth - labelWidth;
    const lines = split(value, textWidth);
    const noteLines = note ? split(note, textWidth, 7.5) : [];
    const height = lines.length * bodyLeading + noteLines.length * 4 + 5;
    if (height <= bottom - top && y + height > bottom) {
      addPage();
      doc.setFont('times', 'bold');
      doc.setFontSize(11.5);
      doc.setTextColor(...COLORS.ink);
      doc.text(`${pdfText(groupName || 'Evidence group')} (continued)`, marginX, y);
      y += 9;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor(...COLORS.gold);
    doc.text(pdfText(label), marginX, y);
    writeLines(lines, { x: marginX + labelWidth, width: textWidth });
    if (noteLines.length) {
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(...COLORS.muted);
      noteLines.forEach((line, index) => doc.text(line, marginX + labelWidth, y + index * 4));
      y += noteLines.length * 4;
    }
    y += 5;
  }

  function drawSilenceTable(rows) {
    if (!rows.length) return;
    sectionHeading('Coverage and silence checks', false, 28);
    writeParagraph('Low story volume is a prompt for outreach, not evidence that no harm occurred.', { color: COLORS.muted });
    y += 6;

    const widths = [contentWidth * 0.43, contentWidth * 0.19, contentWidth * 0.24, contentWidth * 0.14];
    const headings = ['System', 'Priority', 'Approved / expected', 'Score'];
    const drawHeader = (continued = false) => {
      if (continued) {
        doc.setFont('times', 'bold');
        doc.setFontSize(14);
        doc.setTextColor(...COLORS.ink);
        doc.text('Coverage and silence checks (continued)', marginX, y);
        y += 8;
      }
      ensureSpace(10);
      doc.setFillColor(...COLORS.wash);
      doc.rect(marginX, y, contentWidth, 8, 'F');
      let x = marginX;
      headings.forEach((heading, index) => {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...COLORS.ink);
        doc.text(heading, index >= 2 ? x + widths[index] - 2 : x + 2, y + 5.2, index >= 2 ? { align: 'right' } : undefined);
        x += widths[index];
      });
      y += 8;
      doc.setDrawColor(...COLORS.rule);
      doc.line(marginX, y, pageWidth - marginX, y);
    };

    drawHeader();
    rows.forEach((row) => {
      const values = [row.system, row.priority, row.volume, row.score];
      const cells = values.map((value, index) => split(value ?? '-', widths[index] - 4, index === 0 ? 8.5 : 8));
      const rowHeight = Math.max(10, 4 + Math.max(...cells.map((cell) => cell.length)) * 4);
      if (y + rowHeight > bottom) {
        addPage();
        drawHeader(true);
      }
      let x = marginX;
      cells.forEach((cell, cellIndex) => {
        doc.setFont('helvetica', cellIndex === 0 ? 'bold' : 'normal');
        doc.setFontSize(cellIndex === 0 ? 8.5 : 8);
        doc.setTextColor(...(cellIndex === 0 ? COLORS.ink : COLORS.muted));
        cell.forEach((line, lineIndex) => {
          const rightAligned = cellIndex >= 2;
          doc.text(line, rightAligned ? x + widths[cellIndex] - 2 : x + 2, y + 6 + lineIndex * 4, rightAligned ? { align: 'right' } : undefined);
        });
        x += widths[cellIndex];
      });
      y += rowHeight;
      doc.setDrawColor(...COLORS.rule);
      doc.line(marginX, y, pageWidth - marginX, y);
    });
  }

  function drawProvenance(items) {
    if (!items.length) return;
    const estimatedHeight = 22 + items.reduce((sum, item) => (
      sum + Math.max(12, split(item.value, contentWidth - 36, 9.5).length * 4.8 + 4)
    ), 0);
    if (estimatedHeight <= bottom - top && y + estimatedHeight > bottom) addPage();
    sectionHeading('Review and provenance', false, 16);
    items.forEach((item) => {
      const labelWidth = 36;
      const valueWidth = contentWidth - labelWidth;
      const lines = split(item.value, valueWidth, 9.5);
      const rowHeight = Math.max(12, lines.length * 4.8 + 4);
      ensureSpace(Math.min(rowHeight, 16));
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.5);
      doc.setTextColor(...COLORS.muted);
      doc.text(pdfText(item.label), marginX, y);
      writeLines(lines, {
        x: marginX + labelWidth,
        width: valueWidth,
        fontSize: 9.5,
        lineHeight: 4.8,
        color: COLORS.ink,
      });
      y += 4;
    });
  }

  function drawPageFurniture() {
    const totalPages = doc.getNumberOfPages();
    for (let page = 1; page <= totalPages; page += 1) {
      doc.setPage(page);
      if (page > 1) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(...COLORS.ink);
        doc.text('ALGOSTORIES', marginX, 10);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(...COLORS.muted);
        doc.text(fitToWidth(doc, briefing.title, contentWidth - 35), pageWidth - marginX, 10, { align: 'right' });
        doc.setDrawColor(...COLORS.rule);
        doc.line(marginX, 13, pageWidth - marginX, 13);
      }
      doc.setDrawColor(...COLORS.rule);
      doc.line(marginX, pageHeight - 13, pageWidth - marginX, pageHeight - 13);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7);
      doc.setTextColor(...COLORS.muted);
      doc.text(`AlgoStories | Public briefing | ${publishedDate}`, marginX, pageHeight - 8);
      doc.text(`Page ${page} of ${totalPages}`, pageWidth - marginX, pageHeight - 8, { align: 'right' });
    }
  }
}

export function briefingPdfFilename(slug) {
  const safeSlug = String(slug || 'briefing')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'briefing';
  return `algostories-${safeSlug}-briefing.pdf`;
}

function cleanListPrefix(value) {
  return pdfText(value).replace(/^(?:finding|action|recommendation)\s*\d+\s*[.:\-]\s*/i, '');
}

function dedupeSentences(value) {
  const sentences = pdfText(value).split(/(?<=[.!?])\s+/);
  const seen = new Set();
  return sentences.filter((sentence) => {
    const key = normalizeText(sentence);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  }).join(' ');
}

function metadataValue(metadata, label) {
  return pdfText((metadata || []).find((item) => normalizeText(item.label) === normalizeText(label))?.value || '');
}

function sameText(left, right) {
  return normalizeText(left) === normalizeText(right);
}

function normalizeText(value) {
  return pdfText(value).toLowerCase();
}

function fitToWidth(doc, value, width) {
  const text = pdfText(value);
  if (doc.getTextWidth(text) <= width) return text;
  let shortened = text;
  while (shortened.length > 1 && doc.getTextWidth(`${shortened}...`) > width) shortened = shortened.slice(0, -1);
  return `${shortened.trimEnd()}...`;
}

function pdfText(value) {
  return String(value ?? '')
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2010-\u2015\u2212]/g, '-')
    .replace(/\u2022/g, '-')
    .replace(/\u00A0/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}
