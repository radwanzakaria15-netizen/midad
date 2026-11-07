const ALLOWED_ORIGIN = "https://radwanzakaria15-netizen.github.io";
const MODEL = "gemini-3.8-flash";

function cors(origin) {
  const allowed = origin === ALLOWED_ORIGIN ? origin : ALLOWED_ORIGIN;
  return {
    "Access-Control-Allow-Origin": allowed,
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

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: cors(origin) });
    }
    if (origin !== ALLOWED_ORIGIN) return json({ error: "مصدر الطلب غير مسموح." }, 403, origin);
    if (request.method !== "POST") return json({ error: "طريقة الطلب غير مدعومة." }, 405, origin);
    if (!env.GEMINI_API_KEY) return json({ error: "لم يُضبط مفتاح Gemini السري في إعدادات الخادم." }, 503, origin);

    let input;
    try { input = await request.json(); }
    catch { return json({ error: "بيانات الطلب غير صالحة." }, 400, origin); }

    const kind = input.kind === "assessment" ? "assessment" : input.kind === "activity" ? "activity" : "";
    const lessonTitle = String(input.lessonTitle || "").trim().slice(0, 180);
    const subject = String(input.subject || "").trim().slice(0, 100);
    const level = String(input.level || "").trim().slice(0, 100);
    const difficulty = String(input.difficulty || "سهل").slice(0, 30);
    const activityType = String(input.activityType || "متنوع").slice(0, 60);
    if (!kind || !lessonTitle) return json({ error: "حدد نوع المخرج وعنوان الدرس." }, 400, origin);

    const format = kind === "activity"
      ? '{"title":"عنوان قصير","type":"نوع النشاط","items":[{"q":"تعليمة أو سؤال واضح للتلميذ","a":"الإجابة أو الحل النموذجي"}]}'
      : '{"title":"عنوان التقويم","subject":"المادة","level":"المستوى","duration":10,"questions":[{"q":"سؤال قصير واضح","a":"الإجابة النموذجية"}]}';

    const task = kind === "activity"
      ? "أنشئ نشاطاً تعليمياً واحداً من 5 إلى 7 عناصر. نوع النشاط المطلوب: " + activityType + ". يجب أن تكون التعليمات مناسبة للمستوى، متنوعة، قابلة للتنفيذ داخل القسم، ولكل عنصر إجابة نموذجية موجزة."
      : "أنشئ تقويماً قصيراً من خمسة أسئلة متنوعة فقط، مناسباً للمستوى، مع إجابة نموذجية لكل سؤال. اجعل المدة 5 إلى 10 دقائق. نوّع بين الفهم والتطبيق ولا تكرر السؤال نفسه.";

    const prompt = [
      "أنت مساعد تربوي متخصص في التعليم الابتدائي باللغة العربية.",
      "أنشئ محتوى تعليمياً دقيقاً وبسيطاً ومناسباً لعمر التلاميذ. لا تطلب أسماء التلاميذ أو أي بيانات شخصية.",
      "عنوان الدرس: " + lessonTitle,
      "المادة: " + (subject || "غير محددة"),
      "المستوى: " + (level || "التعليم الابتدائي"),
      "الصعوبة: " + difficulty,
      task,
      "أعد JSON صالحاً فقط، دون Markdown أو مقدمة أو نص خارج JSON، ووفق هذا الشكل حرفياً:",
      format
    ].join("\n");

    try {
      const upstream = await fetch("https://generativelanguage.googleapis.com/v1beta/models/" + MODEL + ":generateContent", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-goog-api-key": env.GEMINI_API_KEY
        },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", temperature: 0.55, maxOutputTokens: 2200 }
        })
      });
      const result = await upstream.json();
      if (!upstream.ok) {
        const apiMessage = String(result?.error?.message || "لم تُرجع Google تفاصيل إضافية.").slice(0, 500);
        const apiStatus = String(result?.error?.status || upstream.statusText || "UNKNOWN").slice(0, 80);
        return json({
          error: "رفضت خدمة Gemini الطلب (" + upstream.status + " - " + apiStatus + "): " + apiMessage,
          diagnostic: { httpStatus: upstream.status, apiStatus }
        }, 502, origin);
      }
      const text = result?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("").trim();
      if (!text) return json({ error: "لم يُرجع Gemini محتوى. حاول مرة أخرى." }, 502, origin);
      let parsed;
      try { parsed = JSON.parse(text); }
      catch { return json({ error: "تعذر قراءة صيغة النتيجة. أعد المحاولة." }, 502, origin); }

      if (kind === "activity") {
        if (!Array.isArray(parsed.items)) return json({ error: "نتيجة النشاط غير مكتملة." }, 502, origin);
        parsed.items = parsed.items.slice(0, 7).filter(x => x && String(x.q || "").trim()).map(x => ({ q: String(x.q).slice(0, 500), a: String(x.a || "").slice(0, 500) }));
      } else {
        if (!Array.isArray(parsed.questions)) return json({ error: "نتيجة التقويم غير مكتملة." }, 502, origin);
        parsed.questions = parsed.questions.slice(0, 5).filter(x => x && String(x.q || "").trim()).map(x => ({ q: String(x.q).slice(0, 500), a: String(x.a || "").slice(0, 500) }));
        parsed.duration = 10;
      }
      return json({ result: parsed }, 200, origin);
    } catch {
      return json({ error: "تعذر الاتصال بخدمة Gemini حالياً." }, 502, origin);
    }
  }
};
