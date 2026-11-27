const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const vm = require("node:vm");
const path = require("node:path");

const readerSource = fs.readFileSync(path.join(__dirname, "..", "document-reader.js"), "utf8");
function makeReader(pageItems) {
  const window = {};
  const document = {
    createElement(tag) { return { tagName: tag, src: "", async: false, onload: null, onerror: null }; },
    head: {
      appendChild(script) {
        if (script.src.includes("pdf.min.js")) {
          window.pdfjsLib = {
            GlobalWorkerOptions: {},
            getDocument() {
              return { promise: Promise.resolve({
                numPages: pageItems.length,
                getPage: async pageNumber => ({ getTextContent: async () => ({ items: pageItems[pageNumber - 1] }) })
              }) };
            }
          };
        }
        queueMicrotask(() => script.onload?.());
      }
    }
  };
  vm.runInNewContext(readerSource, { window, document, Uint8Array, Promise });
  return window.midadExtractDocumentText;
}
const pdfFile = { name: "sample.pdf", type: "application/pdf", size: 100, arrayBuffer: async () => new ArrayBuffer(1) };

function makeWordReader(messages) {
  const window = {};
  const document = {
    createElement(tag) { return { tagName: tag, src: "", async: false, onload: null, onerror: null }; },
    head: {
      appendChild(script) {
        window.mammoth = {
          extractRawText: async () => ({ value: "Extracted Word text", messages })
        };
        queueMicrotask(() => script.onload?.());
      }
    }
  };
  vm.runInNewContext(readerSource, { window, document, Uint8Array, Promise });
  return window.midadExtractDocumentText;
}
const wordFile = {
  name: "sample.docx",
  type: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  size: 100,
  arrayBuffer: async () => new ArrayBuffer(1)
};

test("warns about pages without extractable text while preserving other pages", async () => {
  const extract = makeReader([[{ str: "Page one text" }], [], [{ str: "Page three text" }]]);
  const progress = [];
  const text = await extract(pdfFile, event => progress.push(event));
  const warning = progress.find(event => event.type === "warning");
  assert.ok(text.includes("Page one text"));
  assert.ok(text.includes("Page three text"));
  assert.ok(text.indexOf("Page one text") < text.indexOf("Page three text"));
  assert.deepEqual(Array.from(warning.pages), [2]);
  assert.match(warning.message, /OCR/);
});

test("does not issue a missing-text warning when every page has text", async () => {
  const extract = makeReader([[{ str: "Page one" }], [{ str: "Page two" }]]);
  const progress = [];
  await extract(pdfFile, event => progress.push(event));
  assert.equal(progress.some(event => event.type === "warning"), false);
});

test("still rejects PDFs with no extractable text on any page", async () => {
  const extract = makeReader([[], []]);
  await assert.rejects(extract(pdfFile), /OCR/);
});
test("reports Mammoth Word conversion warnings without discarding extracted text", async () => {
  const extract = makeWordReader([{ type: "warning", message: "unsupported style" }]);
  const progress = [];
  const text = await extract(wordFile, event => progress.push(event));
  assert.equal(text, "Extracted Word text");
  const warning = progress.find(event => event.type === "warning");
  assert.ok(warning);
  assert.match(warning.message, /1 ملاحظة/);
});

test("does not issue a Word warning when Mammoth reports no notices", async () => {
  const extract = makeWordReader([]);
  const progress = [];
  const text = await extract(wordFile, event => progress.push(event));
  assert.equal(text, "Extracted Word text");
  assert.equal(progress.some(event => event.type === "warning"), false);
});

