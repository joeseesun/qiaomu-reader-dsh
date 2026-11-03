export function navigationPdf({texts=['Opening page', 'Middle page: lower destination', 'Final page: LAST_PAGE_EVIDENCE'],rotation=0}={}) {
 const objects=[null,null,'<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>',null,null];
 const pageIds=[];
 for(const text of texts){const pageId=objects.length+1;pageIds.push(pageId);objects.push(null);const streamId=objects.length+1;const escape=s=>s.replace(/[\\()]/g,'\\$&');const dense=text.length>1000;const lines=dense?text.match(/.{1,120}/g):[text];const stream=`BT /F1 ${dense?2:12} Tf 40 1300 Td ${lines.map((s,i)=>`${i?'0 -3 Td ':''}(${escape(s)}) Tj`).join(' ')} ET${pageIds.length===2?' BT /F1 12 Tf 300 200 Td (LOWER_TARGET_EVIDENCE) Tj ET':''}`;objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);objects[pageId-1]=`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 700 1400] /Rotate ${rotation} /Resources << /Font << /F1 3 0 R >> >> /Contents ${streamId} 0 R ${pageIds.length===1?'/Annots [LINK_REF]':''} >>`;}
 const target=pageIds[Math.min(1,pageIds.length-1)];
 const linkId=objects.length+1;objects.push('<< /Type /Annot /Subtype /Link /Rect [40 1100 240 1140] /Dest (lower) /Border [0 0 0] >>');
 objects[pageIds[0]-1]=objects[pageIds[0]-1].replace('LINK_REF',`${linkId} 0 R`);
 objects[0]=`<< /Type /Catalog /Pages 2 0 R /Outlines 4 0 R /Names << /Dests << /Names [(lower) [${target} 0 R /XYZ 300 200 null]] >> >> >>`;
 objects[1]=`<< /Type /Pages /Kids [${pageIds.map(id=>`${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`;
 objects[3]='<< /Type /Outlines /First 5 0 R /Last 5 0 R /Count 1 >>';
 objects[4]='<< /Title (Lower destination) /Parent 4 0 R /Dest (lower) >>';
 let pdf='%PDF-1.4\n';const offsets=[0];for(let i=0;i<objects.length;i++){offsets.push(pdf.length);pdf+=`${i+1} 0 obj\n${objects[i]}\nendobj\n`;}
 const xref=pdf.length;pdf+=`xref\n0 ${offsets.length}\n0000000000 65535 f \n${offsets.slice(1).map(n=>`${String(n).padStart(10,'0')} 00000 n \n`).join('')}trailer\n<< /Size ${offsets.length} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
 return new TextEncoder().encode(pdf);
}
