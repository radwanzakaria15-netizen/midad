const ALLOWED_ORIGIN = "https://radwanzakaria15-netizen.github.io";
const MODEL = "gemini-3.8-flash";

function cors(origin) {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
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
    if (origin !== ALLOWED_ORIGIN) return json({ error: "مصدر الطلب غير مسموح." }, 403, origin);
    if (request.method !== "POST") return json({ error: "طريقة الطلب غير مدعومة." }, 405, origin);
    if (!env.GEMINI_API_KEY) return json({ error: "لم يُضبط مفتاح Gemini السري في إعدادات الخادم." }, 503, origin);

    let input;
    try { input = await request.json(); } catch { return json({ error: "بيانات الطلب غير صالحة." }, 400, origin); }
    const kind = input.kind === "experience" ? "experience" : input.kind === "assessment" ? "assessment" : input.kind === "activity" ? "activity" : "";
    const lessonTitle = clean(input.lessonTitle, 180);
    const subject = clean(input.subject, 100);
    const level = clean(input.level, 100);
    const difficulty = clean(input.difficulty || "سهل", 30);
    const activityType = clean(input.activityType || "متنوع", 60);
    const content = clean(input.content, 18000);
    const mode = ["board", "interactive", "summary"].includes(input.mode) ? input.mode : "";
    if (!kind || !lessonTitle) return json({ error: "حدد نوع المخرج وعنوان الدرس." }, 400, origin);
    if (kind === "experience" && !mode) return json({ error: "حدد نمط التجربة التعليمية." }, 400, origin);

    let format, task;
    if (kind === "experience") {
      format = '{"title":"عنوان الدرس","intro":"تمهيد قصير","sections":[{"heading":"عنوان الفكرة","body":"شرح دقيق ومبسط","example":"مثال تطبيقي مناسب","visual":{"type":"flow","labels":["مرحلة 1","مرحلة 2"]}}],"questions":[{"question":"سؤال واضح","options":["خيار أ","خيار ب","خيار ج"],"correctIndex":0,"feedback":"تفسير موجز للإجابة"}],"keyTerms":[{"term":"مصطلح","definition":"تعريف موجز"}],"challenge":{"question":"تحد بسيط","answer":"إجابة مقترحة"}}';
      task = {
        board: "أنشئ شرح سبورة من 4 إلى 7 مراحل متسلسلة. في كل مرحلة عنوان وفكرة مشروحة ومثال تطبيقي، وأضف مخططاً صغيراً عند الحاجة. أعد سؤال تحقق واحداً أو اثنين. اكتب مادة الشرح الفعلية لا وصفاً لما يجب عرضه.",
        interactive: "أنشئ تجربة تفاعلية من 3 إلى 5 مقاطع قصيرة، و3 إلى 5 أسئلة اختيار متعدد. لكل سؤال ثلاثة خيارات، وحدد correctIndex من 0 إلى 2 وقدم تغذية راجعة. اجعل الأسئلة مرتبطة بما سبق شرحه.",
        summary: "أنشئ ملخصاً من 3 إلى 5 أفكار أساسية، و4 إلى 8 كلمات مفتاحية، وخريطة أفكار من عناوين الأقسام، وتحدياً بسيطاً في النهاية."
      }[mode];
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
          generationConfig: { responseMimeType: "application/json", temperature: 0.45, maxOutputTokens: kind === "experience" ? 4200 : kind === "activity" ? 1200 : 1500 }
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
          visual: { type: clean(s.visual?.type || "none", 20), labels: Array.isArray(s.visual?.labels) ? s.visual.labels.slice(0, 6).map(x => clean(x, 100)) : [] }
        }));
        parsed.title = clean(parsed.title || lessonTitle, 180);
        parsed.intro = clean(parsed.intro, 700);
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
      } else {
        if (!Array.isArray(parsed.questions)) return json({ error: "نتيجة التقويم غير مكتملة." }, 502, origin);
        parsed.questions = parsed.questions.slice(0, 5).filter(x => x && clean(x.q, 500)).map(x => ({ q: clean(x.q, 500), a: clean(x.a, 500) }));
        parsed.duration = 10;
      }
      return json({ result: parsed }, 200, origin);
    } catch {
      return json({ error: "تعذر الاتصال بخدمة Gemini حالياً." }, 502, origin);
    }
  }
};