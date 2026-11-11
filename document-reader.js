(function(){
  const scriptCache={};
  function loadScript(src){
    if(scriptCache[src])return scriptCache[src];
    scriptCache[src]=new Promise((resolve,reject)=>{
      const s=document.createElement("script");s.src=src;s.async=true;
      s.onload=resolve;s.onerror=()=>{delete scriptCache[src];reject(new Error("تعذر تحميل مكتبة قراءة الملفات. تحقق من الاتصال بالإنترنت."))};
      document.head.appendChild(s);
    });
    return scriptCache[src];
  }
  window.midadExtractDocumentText=async function(file){
    if(!file)throw new Error("اختر ملفاً أولاً.");
    if(file.size>20*1024*1024)throw new Error("حجم الملف أكبر من 20 ميغابايت.");
    const name=(file.name||"").toLowerCase();
    if(name.endsWith(".docx")||file.type==="application/vnd.openxmlformats-officedocument.wordprocessingml.document"){
      await loadScript("https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js");
      if(!window.mammoth)throw new Error("تعذرت تهيئة قارئ Word.");
      const result=await window.mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});
      const text=(result.value||"").trim();
      if(!text)throw new Error("لم نعثر على نص داخل ملف Word.");
      return text.slice(0,30000);
    }
    if(name.endsWith(".pdf")||file.type==="application/pdf"){
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
      const pdfjs=window.pdfjsLib;
      if(!pdfjs)throw new Error("تعذرت تهيئة قارئ PDF.");
      pdfjs.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      const pdf=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
      const pages=[];
      for(let p=1;p<=pdf.numPages;p++){
        const page=await pdf.getPage(p),content=await page.getTextContent();
        pages.push(content.items.map(x=>x.str||"").join(" "));
      }
      const text=pages.join("\n\n").trim();
      if(!text)throw new Error("لم يُعثر على نص قابل للاستخراج. إذا كان PDF ممسوحاً ضوئياً، فحوّله إلى PDF قابل للبحث أو استخدم OCR.");
      return text.slice(0,30000);
    }
    throw new Error("الصيغ المدعومة: PDF وWord بصيغة DOCX فقط.");
  };
})();