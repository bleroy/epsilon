// XB Reference - TI-99/4A Extended Basic Reference Documentation
// (c) 2022 Bertrand Le Roy

'use strict'

import { el, html } from "../../lib/dom.js";
import { prettify, renderByte } from "../../lib/xb.js";
import { parse } from "../node_modules/yaml/browser/dist/public-api.js";
import { marked } from "../node_modules/marked/lib/marked.esm.js";

function htmlFromMd(str) {
    return hexHandler(sampleHandler(html(marked.parse(str))));
}

function sampleHandler(str) {
    return html(str.html.replace(/\<code\>xb /g, "<code class=\"language-xb\">"));
}

function hexHandler(str) {
    return html(str.html.replace(/\<code\>hex /g, "<code class=\"language-hex\">"));
}

// Set-up DOM loaded event.
document.addEventListener('DOMContentLoaded', async e => {
    const yamlText = await (await fetch("xb.yaml")).text();
    const yaml = parse(yamlText);

    const index = document.getElementById("index");
    const detailsList = document.getElementById("details-list");

    for (let keyword in yaml.keywords) {
        const indexItem = el(index, "ref-index-item", "", "li");
        el(indexItem, "ref-item-link", keyword, "a", { href: `#${keyword}` });
        const details = yaml.keywords[keyword];
        const detailsItem = el(detailsList, "ref-details-item", "", "li");
        el(detailsItem, "ref-item-title", keyword, "h2", { id: keyword });
        el(detailsItem, "ref-item-format", htmlFromMd(`\`\`\`\n${details.format}\n\`\`\``));
        el(detailsItem, "ref-item-description", htmlFromMd(details.description), "p");
        if (details.options) {
            el(detailsItem, "ref-item-options", htmlFromMd(details.options), "p");
        }
        if (details.examples) {
            el(detailsItem, "ref-item-examples", htmlFromMd(details.examples), "p");
        }
        if (details.program) {
            el(detailsItem, "ref-item-program", htmlFromMd(details.program), "p");
        }
    }

    // Prettify all code samples
    for (let codeEl of document.querySelectorAll("code[language=xb], code.language-xb")) {
        prettify(codeEl);
    }

    // Prettify all hexadecimal samples
    for (let codeEl of document.querySelectorAll("code[language=hex], code.language-hex")) {
        const src = codeEl.innerText;
        const parent = codeEl.parentNode;
        const table = el(document.body, "hex-view inline", null, "table");
        const header = el(table, null, null, "thead");
        const tbody = el(table, null, null, "tbody");
        let first = true;
        const hasHeader = src.indexOf("---") !== -1;
        for (let line of src.split(/[\r\n]/g)) {
            let firstCell = true;
            if (line.indexOf("---") === 0) continue;
            if (first && hasHeader) {
                first = false;
                const headerRow = el(header, null, null, "tr");
                for (let headEntry of line.split(/\s*\|\s*/g)) {
                    el(headerRow, null, headEntry, "th", { colspan: firstCell ? 1 : 10 });
                    if (firstCell) {
                        firstCell = false;
                    }
                }
            }
            else if (line.replace(/\s/g, "") !== "") {
                const row = el(tbody, "line", null, "tr");
                for (let entry of line.split(/\s*\|\s*/g)) {
                    if (firstCell) {
                        el(row, null, entry, "td");
                        firstCell = false;
                    } else {
                        renderByte(row, entry);
                    }
                }
            }
        }
        parent.insertBefore(table, codeEl);
        parent.removeChild(codeEl)
    }
});