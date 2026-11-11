const ALLOWED_ORIGIN = "https://radwanzakaria15-netizen.github.io";
const MODEL = "gemini-3.5-flash-lite";

function cors(origin) {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin"
  };
}
function json(data, status, origin) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...cors(origin), "Content-Type": "application/json; charset=utf-8" }
  });
}
function clean(value, max) { return String(value || "").trim().slice(0, max); }

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(origin) });
    if (origin && origin !== ALLOWED_ORIGIN) return json({ error: "مصدر الطلب غير مسموح." }, 403, origin);
    if (request.method === "GET") return json({ ok: true, service: "Midad Gemini Worker", model: MODEL, keyConfigured: !!env.GEMINI_API_KEY }, 200, origin);
    if (request.method !== "POST") return json({ error: "طريقة الطلب غير مدعومة." }, 405, origin);
    if (!env.GEMINI_API_KEY) return json({ error: "لم يُضبط مفتاح Gemini السري في إعدادات الخادم. أضفه في Cloudflare Worker Secrets باسم GEMINI_API_KEY." }, 503, origin);

    let input;
    try { input = await request.json(); } catch { return json({ error: "بيانات الطلب غير صالحة." }, 400, origin); }
    const rawKind = clean(input.kind || input.outputType || input.type, 40).toLowerCase();
    const kind = ["experience","assessment","activity","revision"].includes(rawKind) ? rawKind : ["board","interactive","summary"].includes(rawKind) ? "experience" : "";
    const lessonTitle = clean(input.lessonTitle || input.title || input.topic, 180);
    const subject = clean(input.subject, 100);
    const level = clean(input.level, 100);
    const difficulty = clean(input.difficulty || "سهل", 30);
    const activityType = clean(input.activityType || "متنوع", 60);
    const content = clean(input.content, 18000);
    const sourceUrl = clean(input.sourceUrl, 1000);
    const questionCount = Math.max(5, Math.min(15, Number(input.questionCount) || 10));
    const include = input.include && typeof input.include === "object" ? input.include : {};
    const mode = ["board", "interactive", "summary"].includes(input.mode) ? input.mode : ["board", "interactive", "summary"].includes(rawKind) ? rawKind : kind === "experience" ? "board" : "";
    if (!kind) return json({ error: "تعذر تحديد نوع المخرج. أعد فتح أداة التوليد وحاول مجدداً." }, 400, origin);
    if (!lessonTitle) return json({ error: "اكتب عنوان الدرس أولاً ثم اضغط إنشاء." }, 400, origin);
    if (kind === "experience" && !mode) return json({ error: "حدد نمط التجربة التعليمية." }, 400, origin);

    let format, task;
    if (kind === "experience") {
      format = '{"title":"عنوان الدرس","intro":"تمهيد قصير","visual":{"nodes":[{"id":"a","label":"مفهوم","x":50,"y":50}],"edges":[]},"scene":{"type":"diagram","title":"عنوان المشهد","nodes":[{"id":"a","label":"عنصر","x":50,"y":50}],"edges":[],"steps":[{"title":"المرحلة","description":"شرح المرحلة"}]},"sections":[{"heading":"عنوان الفكرة","body":"شرح دقيق ومبسط","example":"مثال تطبيقي مناسب","visual":{"type":"diagram","nodes":[{"id":"a","label":"فكرة","x":50,"y":50}],"edges":[]}}],"questions":[{"question":"سؤال واضح","options":["خيار أ","خيار ب","خيار ج"],"correctIndex":0,"feedback":"تفسير موجز للإجابة"}],"keyTerms":[{"term":"مصطلح","definition":"تعريف موجز"}],"challenge":{"question":"تحد بسيط","answer":"إجابة مقترحة"}}';
      task = {
        board: "أنشئ شرح سبورة من 4 إلى 7 مراحل متسلسلة. في كل مرحلة عنوان وفكرة مشروحة ومثال تطبيقي، وأضف مخططاً صغيراً عند الحاجة. أعد سؤال تحقق واحداً أو اثنين. اكتب مادة الشرح الفعلية لا وصفاً لما يجب عرضه.",
        interactive: "أنشئ شرحاً تفاعلياً من 4 إلى 6 مراحل، مع 3 أسئلة تحقق. أنشئ scene عاماً لأي موضوع: 4 إلى 8 nodes تمثل الأشياء أو المفاهيم المهمة، لكل عنصر id وlabel وإحداثيات x وy بين 8 و92، وروابط edges باستخدام from وto. أضف steps مرتبة، ولكل مرحلة title وdescription يشرح ما يحدث. لا تستخدم رسماً مخصصاً لدورة الماء إلا إذا كان الموضوع دورة الماء. اجعل الرسم مفهوماً بصرياً وليس مجرد كلمات متفرقة.",
        summary: "أنشئ ملخصاً بصرياً إبداعياً من 4 إلى 7 أفكار أساسية، وأنشئ visual عاماً فيه 4 إلى 8 nodes موزعة حول الفكرة المركزية وروابط edges توضح العلاقات بينها. أضف 4 إلى 8 كلمات مفتاحية، وخريطة أفكار وأمثلة قصيرة. اجعل النصوص مختصرة جداً حتى يظهر الإنفوغراف واضحاً."
      }[mode];
    } else if (kind === "revision") {
      format = '{"title":"عنوان المراجعة","questions":[{"type":"mcq","topic":"مفهوم محدد","question":"سؤال واضح","options":["أ","ب","ج","د"],"correctIndex":0,"explanation":"تفسير تعليمي موجز"}],"flashcards":[{"front":"سؤال البطاقة","back":"الإجابة الدقيقة","topic":"المفهوم"}],"matchPairs":[{"left":"مصطلح أو عنصر","right":"تعريفه أو ما يناسبه"}],"topics":[{"name":"اسم المفهوم","questionCount":2}]}';
      task = "أنشئ " + questionCount + " سؤالاً اعتماداً حصراً على نص الدرس. أنواع الأسئلة المطلوبة: " + [include.mcq ? "اختيار من متعدد" : "", include.tf ? "صح أو خطأ" : ""].filter(Boolean).join(" و ") + ". أنشئ بطاقات مراجعة: " + (include.flashcards ? "نعم، من 4 إلى 8 بطاقات" : "لا") + ". وزّع الأسئلة على المفاهيم الفعلية الواردة في الدرس، واجعل لكل سؤال topic محدداً، وخيارات غير ملتبسة، ومؤشراً صحيحاً يبدأ من الصفر، وتفسيراً يشرح سبب صحة الإجابة. أسئلة الصح والخطأ يجب أن تستخدم type=tf وخيارين هما صح وخطأ. لا تجعل كل الإجابات الصحيحة في الموضع نفسه. لا تضف معلومة غير موجودة في المصدر، ولا تنشئ أسئلة من جملة مبتورة أو غير مفهومة. إذا كان النص غير كافٍ لعدد الأسئلة المطلوب، أعد العدد الذي يمكن دعمه فقط.";
    } else {
      format = kind === "activity"
        ? '{"title":"عنوان قصير","type":"نوع النشاط","items":[{"q":"تعليمة أو سؤال واضح للتلميذ","a":"الإجابة أو الحل النموذجي"}]}'
        : '{"title":"عنوان التقويم","subject":"المادة","level":"المستوى","duration":10,"questions":[{"q":"سؤال قصير واضح","a":"الإجابة النموذجية"}]}';
      task = kind === "activity"
        ? "صمّم لعبة تعليمية حقيقية قابلة للعب من نوع " + activityType + ". أخرج 5 إلى 7 أزواج متطابقة فقط في items: q بطاقة السؤال أو العنصر، وa البطاقة المطابقة لها. اجعل كل زوج فريداً، قصيراً، واضحاً، مناسباً للمستوى، ويمكن للطفل حلّه بالاختيار والمطابقة. لا تكتب أسئلة تقويم تقليدية ولا تعرض الإجابة داخل q."
        : "أنشئ تقويماً قصيراً من خمسة أسئلة واضحة ومتنوعة مرتبطة بالدرس، مع إجابة نموذجية دقيقة لكل سؤال. اجعل الأسئلة مستقلة وقابلة للطباعة، ولا تحوّل التقويم إلى لعبة.";
    }

    const prompt = [
      "أنت مصمم تعلم ومساعد تربوي متخصص. أخرج محتوى عربياً سليماً مناسباً للمستوى.",
      "المادة: " + (subject || "غير محددة"),
      "الطور والمستوى: " + (level || "غير محدد"),
      "عنوان الدرس: " + lessonTitle,
      content ? "المصدر الذي يجب تحليله والالتزام به:\n" + content : "لم يرفق الأستاذ نص الدرس. استخدم المعرفة الدراسية العامة الموثوقة، وتجنب الادعاءات الدقيقة غير المؤكدة.",
      sourceUrl ? "رابط المصدر الذي أرفقه الأستاذ (لا تدّع أنك شاهدت الفيديو أو استخرجت تفريغه ما لم يكن نصه مرفقاً): " + sourceUrl : "",
      content ? "تعليمات إلزامية: استخرج الأفكار الأساسية من المصدر، لا تحذف فكرة جوهرية، لا تضف معلومة تناقضه، ولا تختلق حقائق. إذا كان المصدر لا يكفي لإثبات معلومة فلا تقدمها كحقيقة." : "",
      "النمط المطلوب: " + (mode === "board" ? "الشرح بالسبورة" : mode === "interactive" ? "الشرح التفاعلي" : mode === "summary" ? "الملخص الممتع" : kind),
      task,
      "أعد JSON صالحاً فقط، دون Markdown أو مقدمة أو نص خارجه، ووفق البنية التالية حرفياً:",
      format
    ].filter(Boolean).join("\n");

    try {
      const upstream = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + MODEL + ":generateContent", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-goog-api-key": env.GEMINI_API_KEY },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.35, maxOutputTokens: kind === "experience" ? 3000 : kind === "activity" ? 1400 : kind === "revision" ? 2600 : 1000 }
        })
      });
      const result = await upstream.json();
      if (!upstream.ok) {
        const apiMessage = clean(result?.error?.message || "لم تُرجع Google تفاصيل إضافية.", 500);
        const apiStatus = clean(result?.error?.status || upstream.statusText || "UNKNOWN", 80);
        return json({ error: "رفضت خدمة Gemini الطلب (" + upstream.status + " - " + apiStatus + "): " + apiMessage }, 502, origin);
      }
      const text = result?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("").trim();
      if (!text) return json({ error: "لم يُرجع Gemini محتوى. حاول مرة أخرى." }, 502, origin);
      let parsed;
      try { parsed = JSON.parse(text); } catch { return json({ error: "تعذر قراءة صيغة النتيجة. أعد المحاولة." }, 502, origin); }

      if (kind === "experience") {
        if (!Array.isArray(parsed.sections) || !parsed.sections.length) return json({ error: "نتيجة الدرس غير مكتملة." }, 502, origin);
        parsed.sections = parsed.sections.slice(0, 8).filter(s => s && clean(s.heading, 180) && clean(s.body, 1400)).map(s => ({
          heading: clean(s.heading, 180), body: clean(s.body, 1400), example: clean(s.example, 700),
          visual: s.visual && typeof s.visual === "object" ? s.visual : {}
        }));
        parsed.title = clean(parsed.title || lessonTitle, 180);
        parsed.intro = clean(parsed.intro, 700);
        const cleanDiagram = v => {
          if (!v || typeof v !== "object") return { nodes: [], edges: [] };
          const nodes = Array.isArray(v.nodes) ? v.nodes.slice(0, 10).map((n,i) => ({ id: clean(n.id || String(i), 30), label: clean(n.label || n.title, 90), x: Math.max(8, Math.min(92, Number(n.x) || 50)), y: Math.max(12, Math.min(88, Number(n.y) || 50)) })).filter(n => n.label) : [];
          const ids = new Set(nodes.map(n => n.id));
          const edges = Array.isArray(v.edges) ? v.edges.slice(0, 14).map(e => ({ from: clean(e.from,30), to: clean(e.to,30) })).filter(e => ids.has(e.from) && ids.has(e.to)) : [];
          return { nodes, edges };
        };
        parsed.visual = cleanDiagram(parsed.visual);
        parsed.sections = parsed.sections.map(s => ({ ...s, visual: cleanDiagram(s.visual) }));
        const rawScene = parsed.scene && typeof parsed.scene === "object" ? parsed.scene : {};
        parsed.scene = { title: clean(rawScene.title || lessonTitle, 140), nodes: cleanDiagram(rawScene).nodes, edges: cleanDiagram(rawScene).edges, steps: Array.isArray(rawScene.steps) ? rawScene.steps.slice(0, 7).map(s => typeof s === "string" ? clean(s,180) : ({ title: clean(s.title,120), description: clean(s.description || s.body,400) })) : [] };
        parsed.questions = Array.isArray(parsed.questions) ? parsed.questions.slice(0, 6).map(q => ({
          question: clean(q.question || q.q, 400),
          options: Array.isArray(q.options) ? q.options.slice(0, 4).map(x => clean(x, 180)) : [],
          correctIndex: Math.max(0, Math.min(3, Number(q.correctIndex) || 0)),
          feedback: clean(q.feedback, 400)
        })).filter(q => q.question) : [];
        parsed.keyTerms = Array.isArray(parsed.keyTerms) ? parsed.keyTerms.slice(0, 10).map(k => ({ term: clean(k.term, 120), definition: clean(k.definition, 350) })).filter(k => k.term) : [];
        parsed.challenge = parsed.challenge ? { question: clean(parsed.challenge.question, 400), answer: clean(parsed.challenge.answer, 500) } : null;
      } else if (kind === "activity") {
        if (!Array.isArray(parsed.items)) return json({ error: "نتيجة النشاط غير مكتملة." }, 502, origin);
        parsed.items = parsed.items.slice(0, 7).filter(x => x && clean(x.q, 500)).map(x => ({ q: clean(x.q, 500), a: clean(x.a, 500) }));
      } else if (kind === "revision") {
        if (!Array.isArray(parsed.questions) || !parsed.questions.length) return json({ error: "لم يتم إنشاء أسئلة مراجعة صالحة." }, 502, origin);
        parsed.questions = parsed.questions.slice(0, questionCount).map(q => ({
          type: q.type === "tf" || q.type === "true_false" ? "tf" : "mcq",
          topic: clean(q.topic || "مفهوم الدرس", 120),
          question: clean(q.question || q.q, 500),
          options: Array.isArray(q.options) ? q.options.slice(0, 4).map(x => clean(x, 220)) : [],
          correctIndex: Number.isInteger(Number(q.correctIndex)) ? Number(q.correctIndex) : 0,
          explanation: clean(q.explanation || q.feedback, 700)
        })).filter(q => q.question && q.options.length >= 2 && q.correctIndex >= 0 && q.correctIndex < q.options.length);
        if (!parsed.questions.length) return json({ error: "الأسئلة المولدة غير مكتملة أو لا تحتوي إجابات صالحة." }, 502, origin);
        parsed.flashcards = Array.isArray(parsed.flashcards) ? parsed.flashcards.slice(0, 10).map(c => ({ front: clean(c.front || c.question, 350), back: clean(c.back || c.answer, 500), topic: clean(c.topic || "مراجعة", 120) })).filter(c => c.front && c.back) : [];
        parsed.matchPairs = Array.isArray(parsed.matchPairs) ? parsed.matchPairs.slice(0, 8).map(p => ({ left: clean(p.left,180), right: clean(p.right,220) })).filter(p => p.left && p.right) : [];
        parsed.topics = Array.isArray(parsed.topics) ? parsed.topics.slice(0, 12).map(t => ({ name: clean(t.name || t.topic, 120), questionCount: Math.max(0, Number(t.questionCount) || 0) })).filter(t => t.name) : [];
        parsed.title = clean(parsed.title || lessonTitle, 180);
      } else {
        if (!Array.isArray(parsed.questions)) return json({ error: "نتيجة التقويم غير مكتملة." }, 502, origin);
        parsed.questions = parsed.questions.slice(0, 5).filter(x => x && clean(x.q, 500)).map(x => ({ q: clean(x.q, 500), a: clean(x.a, 500) }));
        parsed.duration = 10;
      }
      return json({ result: parsed }, 200, origin);
    } catch (error) {
      const detail = clean(error && error.message ? error.message : "خطأ غير معروف", 300);
      return json({ error: "تعذر الاتصال بخدمة Gemini: " + detail }, 502, origin);
    }
  }
};