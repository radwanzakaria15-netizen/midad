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
  window.midadExtractDocumentText=async function(file,onProgress){
    if(!file)throw new Error("اختر ملفاً أولاً.");
    if(file.size>20*1024*1024)throw new Error("حجم الملف أكبر من 20 ميغابايت.");
    const name=(file.name||"").toLowerCase();
    if(name.endsWith(".docx")||file.type==="application/vnd.openxmlformats-officedocument.wordprocessingml.document"){
      await loadScript("https://cdn.jsdelivr.net/npm/mammoth@1.8.0/mammoth.browser.min.js");
      if(!window.mammoth)throw new Error("تعذرت تهيئة قارئ Word.");
      if(typeof onProgress==="function")onProgress({type:"word",done:0,total:1,message:"جارٍ استخراج نص Word..."});
      const result=await window.mammoth.extractRawText({arrayBuffer:await file.arrayBuffer()});
      const text=(result.value||"").trim();
      if(!text)throw new Error("لم نعثر على نص داخل ملف Word.");
      const wordNotices=Array.isArray(result.messages)?result.messages.filter(message=>message&&(message.type==="warning"||message.type==="error")):[];
      if(wordNotices.length&&typeof onProgress==="function")onProgress({type:"warning",done:1,total:1,message:"تنبيه: سجّل قارئ Word "+wordNotices.length+" ملاحظة أثناء التحويل. قد تكون بعض التنسيقات أو العناصر غير ممثلة بالكامل في النص المستخرج."});
      if(typeof onProgress==="function")onProgress({type:"word",done:1,total:1,message:"اكتمل استخراج نص Word."});
      return text;
    }
    if(name.endsWith(".pdf")||file.type==="application/pdf"){
      await loadScript("https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js");
      const pdfjs=window.pdfjsLib;
      if(!pdfjs)throw new Error("تعذرت تهيئة قارئ PDF.");
      pdfjs.GlobalWorkerOptions.workerSrc="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      const pdf=await pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer())}).promise;
      const pages=[],pagesWithoutText=[];
      for(let p=1;p<=pdf.numPages;p++){
        const page=await pdf.getPage(p),content=await page.getTextContent();
        const pageText=(content.items||[]).map(x=>x.str||"").join(" ").trim();
        pages.push(pageText);
        if(!pageText)pagesWithoutText.push(p);
        if(typeof onProgress==="function")onProgress({type:"pdf",done:p,total:pdf.numPages,message:"جارٍ استخراج PDF: الصفحة "+p+" من "+pdf.numPages});
      }
      const text=pages.join("\n\n").trim();
      if(!text)throw new Error("لم يُعثر على نص قابل للاستخراج. إذا كان PDF ممسوحاً ضوئياً، فحوّله إلى PDF قابل للبحث أو استخدم OCR.");
      if(pagesWithoutText.length&&typeof onProgress==="function"){
        const shown=pagesWithoutText.slice(0,12).join("، "),more=pagesWithoutText.length>12?"، ...":"";
        onProgress({type:"warning",done:pdf.numPages,total:pdf.numPages,pages:pagesWithoutText,message:"تنبيه: لم يُستخرج نص من "+pagesWithoutText.length+" صفحة ("+shown+more+"). قد تكون فارغة أو ممسوحة ضوئياً؛ إذا كانت تحتوي نصاً فستحتاج إلى OCR."});
      }
      return text;
    }
    throw new Error("الصيغ المدعومة: PDF وWord بصيغة DOCX فقط.");
  };
})();