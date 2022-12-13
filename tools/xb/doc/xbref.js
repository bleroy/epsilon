// XB Reference - TI-99/4A Extended Basic Reference Documentation
// (c) 2022 Bertrand Le Roy

'use strict'

import { el, html } from "../../lib/dom.js";
import { prettify } from "../../lib/xb.js";
import { parse } from "../node_modules/yaml/browser/dist/public-api.js";
import { marked } from "../node_modules/marked/lib/marked.esm.js";

function htmlFromMd(str) {
    return sampleHandler(html(marked.parse(str)));
}

function sampleHandler(str) {
    return html(str.html.replace(/\<code\>xb /g, "<code class=\"language-xb\">"));
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
});