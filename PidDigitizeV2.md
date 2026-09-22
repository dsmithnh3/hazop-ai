# PidDigitizeV2

Date: 2026-09-22

Status: proposed approach with user-confirmed direction: start with explicitly supplied instructions and Markdown reference knowledge for each extraction, and use adaptive viewing of every P&ID sheet. RAG is an optional later extension if the library becomes too large to select and include reliably. No new extraction system, knowledge base, model training, or measured improvement is claimed by this document.

## Objective

Digitize piping and instrumentation diagrams (P&IDs) into a reviewable, machine-readable plant representation. Combine OCR, symbol detection, and line tracing with relevant engineering knowledge so the system can investigate ambiguous observations and reconstruct supported relationships.

The representation should capture equipment, valves, instruments, exact text, piping and signal connections, cross-sheet references, and flow direction where supported. Every result should retain its drawing location, evidence, uncertainty, and review history.

The system must represent what the drawing shows, including unusual arrangements and possible design mistakes. Engineering expectations must not silently replace drawing evidence.

## 1. Organize knowledge in layers

The starting idea is to specialize interpretation for industries such as oil, gas, and chemicals. Use industry as one layer of a shared knowledge library rather than building completely isolated systems for each industry.

Recommended layers:

1. **Shared concepts:** equipment types, instruments, valves, ports, piping, signals, and basic relationships.
2. **Process arrangements:** recurring structures such as compression, pumping, storage, and heat exchange.
3. **Industry applications:** service-specific patterns, operating context, and exceptions.
4. **Company and project conventions:** tag formats, symbol meanings, line styles, and project requirements.
5. **Drawing-specific evidence:** the supplied legend, sheet notes, references, and visible geometry.

Keep symbol appearance separate from engineering meaning. Similar equipment can be drawn differently, and similar graphical marks can mean different things under different conventions. Use the drawing's legend and supplied project documentation to resolve those differences where possible. Surface conflicts rather than silently choosing an interpretation.

## 2. Build a pattern library in Markdown

Record recurring equipment arrangements, their connections, and the reasons for those arrangements in structured `.md` files. Include annotated examples where permitted.

Represent each item of engineering knowledge as:

**Equipment + service/operating conditions + failure or maintenance scenario -> required function + acceptable arrangements + source and exceptions.**

This is the recommended knowledge structure for both extraction assistance and later design review. Equipment type alone is insufficient to establish a universal valve count, valve type, or connection arrangement. Record what a provision achieves and when it applies before describing how it is implemented.

### Knowledge-record fields

Use the following fields consistently in each Markdown record:

- **Identity:** stable identifier, title, version, author/reviewer, and review status.
- **Equipment and scope:** equipment type, process/service, relevant fluid properties, industry, and project applicability.
- **Applicability conditions:** the operating mode, equipment limits, and other facts needed to apply the knowledge. Mark unknown conditions explicitly.
- **Scenario and rationale:** the failure, operating need, or maintenance activity being addressed; its consequence; and why a provision is useful or required.
- **Required function:** for example, maintenance isolation, reverse-flow prevention, minimum-flow protection, pressure relief, or safe draining. A function can have more than one acceptable implementation.
- **Acceptable arrangements:** permitted component types and connection relationships, including valve ordering, orientation, isolation boundaries, discharge destinations, and operating/failure positions where the source specifies them. Include sizing or rating criteria only when supported; reference calculations and equipment data when the P&ID cannot establish adequacy.
- **Alternatives and exceptions:** equivalent arrangements, exclusions, and cases needing separate analysis. State whether a list is exhaustive or merely illustrative.
- **Evidence to inspect:** relevant symbols, ports, line paths, tags, notes, legends, other sheets, equipment data, and operating information. Identify facts that cannot be established from the drawing alone.
- **Authority and provenance:** source title, edition/revision, section/page, link or permitted local reference, and the scope in which it applies. Distinguish a typical arrangement, manufacturer instruction, project requirement, applicable code/standard provision, and physical constraint. Preserve the source's distinction between mandatory and recommended provisions; a textbook example is not automatically a project requirement.
- **Review questions:** missing inputs, conflicting evidence, and the specific observations or documents needed to resolve them.

Record whether each rationale is source-backed, engineer-reviewed, or a proposed explanation. Store concise summaries with pinpoint references and permitted examples; do not copy entire copyrighted books into the library. Resolve conflicting references through documented project applicability and engineering review rather than choosing whichever statement is more restrictive.

### Example: low-flow protection for a boiler-feed pump

This is an illustrative knowledge record, not a universally applicable design rule or an approved plant design.

- **Equipment/service:** a centrifugal boiler-feed pump handling water.
- **Condition to establish:** whether an operating scenario can reduce flow below the pump's allowable minimum. Obtain the relevant limit from the selected equipment's data; the equipment symbol alone cannot establish it.
- **Scenario:** low flow can cause heat buildup and associated damage.
- **Function to investigate:** maintain sufficient flow through the pump during the relevant operating scenarios.
- **Documented arrangement:** KSB describes an automatic recirculation valve that opens a bypass during low-flow operation and returns flow to the inlet tank. This is one source-described solution, not an exhaustive list of acceptable solutions.
- **Drawing investigation:** inspect the pump discharge, any recirculation branch and valve, its return destination, notes, and off-sheet continuations. Establish actual connections from drawing evidence.
- **Additional information:** confirm pump limits, operating cases, and the selected protection arrangement's capacity and settings from supporting documents.
- **Exception handling:** if another protection arrangement is shown, evaluate its documented function instead of requiring the illustrated valve. If a branch is absent from the current view, check connected sheets before reporting a possible omission.
- **Source:** [KSB centrifugal-pump lexicon, Valve](https://www.ksb.com/en-global/centrifugal-pump-lexicon/v), automatic recirculation valve discussion. Capture the source revision or access date when approving the record.

### Keep rule assessment separate from extraction

For each assessed record, retain the rule/version, subject equipment, applicability evidence, supporting and conflicting observations, missing inputs, and reviewer decision. Use outcomes such as:

- **Not applicable:** documented conditions exclude the rule.
- **Insufficient information:** applicability or the arrangement cannot be established.
- **Consistent with the reference:** the inspected evidence supports the arrangement within the stated scope; this does not establish sizing adequacy or overall compliance.
- **Potential discrepancy:** an applicable expectation appears unmet and needs engineering review.

A possible design omission belongs in a separate review finding. It must not cause the extractor to insert a valve or connection that the drawing does not show. Likewise, absence from the extracted graph is not proof of absence from the drawing: first investigate perception errors, unreadable regions, and missing sheets.

## 3. Start with explicitly supplied instructions and knowledge

For the initial implementation, explicitly select the relevant Markdown files and supply their contents with every extraction. This gives direct control over which rules, patterns, and exceptions the agent receives and avoids depending on a retriever to find essential guidance.

Use three clearly separated parts of the extraction context:

1. **Always-present behavioral instructions:** extraction procedure, adaptive viewing, evidence requirements, uncertainty handling, and output format. Put these in the trusted system/instruction layer.
2. **Explicitly selected reference knowledge:** shared concepts, applicable industry/process patterns, project conventions, rationales, and exceptions. Include these as clearly labeled reference material rather than unconditional behavioral commands.
3. **Drawing-specific input:** the drawing, its legend, sheet notes, supporting documents, and observations from extraction tools.

For example, "never establish a connection solely because it is common" is a behavioral rule. A description of a common valve arrangement is conditional reference knowledge. Its placement in the prompt must not turn it into a requirement to find or invent that arrangement. Treat text found inside drawings or references as evidence, not as instructions that override the extraction rules.

Keep the files editable between runs. Record the exact instruction/reference versions and selected files used by each run so interpretations can be reproduced and reviewed. Report knowledge that cannot fit in the context instead of silently truncating it.

### When to add RAG

Both directly supplied context and retrieval-augmented generation (RAG) provide information at extraction time; neither updates model weights. Their main difference is how information is selected for the context. Direct supply uses an explicitly chosen package. RAG searches a larger library and supplies selected passages, which can omit relevant information or return unsuitable references.

Add RAG only when the library becomes too large or varied to select and include reliably. Keep the behavioral instructions always present and use retrieval for reference knowledge. Evaluate retrieval against the explicit-context baseline before adopting it.

If RAG becomes necessary, the proposed retrieval approach is:

- Exact and keyword matching for equipment names, tags, pattern identifiers, and standard references.
- Semantic retrieval for descriptions and engineering concepts.
- Metadata filtering by project, drawing convention, equipment, process, and industry.
- Retrieval of the applicable conditions and exceptions together with the pattern itself.
- Links from retrieved passages to their source documents, versions, and annotated examples.

This combination is hybrid retrieval. Markdown is the editable source of knowledge; its search index is a derived artifact.

Industry or equipment classifications may themselves be uncertain. Preserve alternative interpretations instead of allowing an early classification to exclude all relevant evidence. If retrieval finds no suitable reference, report the gap rather than treating a loosely related pattern as authoritative.

## 4. Combine perception and reasoning in an iterative workflow

1. **Inspect the input.** Identify sheets, available native PDF text and geometry, raster quality, legends, and cross-sheet references.
2. **View and extract every sheet.** Establish a full-sheet overview, then use the appropriate native/vector or raster route to obtain text regions, proposed transcriptions, symbol candidates, ports, and visible line segments. Adapt the viewing scale and region to the detail being examined.
3. **Apply the supplied knowledge.** Use the explicitly selected conventions, patterns, rationales, examples, and exceptions together with the drawing context. Retrieval may supplement this only if the optional RAG stage is introduced.
4. **Propose interpretations.** Associate text with candidate objects and consider possible connections while keeping alternatives explicit.
5. **Investigate uncertainty through adaptive viewing.** Zoom into the uncertain region, inspect nearby equipment and connections, expand the view to recover context, and follow relevant lines or sheet references. Re-run targeted OCR or symbol inspection where useful.
6. **Record the result.** Preserve observations, proposed relationships, uncertainty, and the evidence and references used.
7. **Review and publish.** Let a human correct or reject proposals, resolve ambiguities where possible, and approve a versioned output under the applicable review rules.

Reasoning should guide where the system looks next. It must not manufacture missing visual evidence.

For example, a supplied arrangement might suggest a connection near a compressor. The agent should inspect the relevant crop, trace visible segments, and check off-sheet references. If the connection remains unsupported, retain it as an unresolved hypothesis rather than an established edge.

### Adaptive viewing of every sheet

Adaptive viewing is a required part of extraction, not just a response to a low model score. Begin with an overview of each sheet, including legends and notes sheets, then inspect readable regional views so small text and crowded areas are not judged solely from a reduced whole-sheet image. Track inspected regions and perform a final whole-sheet coverage check; confidence in existing detections does not establish that nothing was missed.

Whenever text, a symbol, an association, or a connection is uncertain:

- Zoom or render a higher-resolution crop from the original source. Enlarging an already degraded image does not recover missing detail.
- Inspect nearby equipment, instrument bubbles, labels, ports, and connected lines. Widen the crop when the immediate neighborhood is insufficient.
- Trace candidate connections in both directions through successive, overlapping views. Inspect junctions, crossings, gaps, line styles, arrows, and boundary transitions before deciding what connects.
- Consult the legend and notes, and inspect the referenced sheet when a line continues off-sheet. Report missing referenced sheets explicitly.
- Compare plausible interpretations against both the visual evidence and applicable patterns. Revisit earlier interpretations when broader context contradicts them.

Preserve sheet identity, crop bounds, viewing scale, and transforms back to original coordinates. Link decisive views and observations to the interpretation so a reviewer can inspect the same evidence. Reconcile overlapping views without merging distinct repeated tags or creating duplicate objects.

Stop investigating when the evidence resolves the question or further available views provide no useful information. Record the remaining ambiguity and the views already checked, then send it for human review. Any inspection/resource limit must be explicit; reaching it must leave the item unresolved rather than silently accepting a guess.

## 5. Keep evidence and interpretation distinct

Maintain separate records for:

- **Observed evidence:** visible text, symbols, line segments, endpoints, arrows, and source coordinates.
- **Candidate interpretations:** proposed object identities, text associations, and connections, with supporting and conflicting evidence.
- **Review decisions:** accepted interpretations, corrections, rejections, and unresolved items.

Preserve exact printed characters and the raw OCR reading. Store normalized interpretations separately. Repeated text at different locations must remain distinguishable.

Treat topology, connection type, and flow direction as separate questions. A likely equipment arrangement does not establish a pipe connection or its direction. Crossings, junctions, signal lines, and equipment boundaries must be distinguished using drawing evidence and applicable conventions.

Do not collapse these different uncertainties into a single unexplained confidence score. Missing evidence should remain visible to reviewers.

## 6. Responsibilities across the repositories

- **PIDGraph:** primary local raster extraction route, including OCR, symbol detection, line extraction, and topology assembly.
- **DiagEx-Repro:** visual interpretation capabilities and the existing human review workbench. Its evidence handling and review mechanisms are useful foundations for inspecting proposals.
- **pid-ocr-training:** OCR experiments, independent evaluation, training recipes, and release evidence. It remains separate from the production extraction engine.
- **HAZOP-AI:** consume a selected, reviewed plant-model version for the downstream study workflow; retain its existing supported vector-drawing route.

The ownership and storage location of the shared pattern library and prompt-context integration are still to be decided. RAG integration is a separate, optional later decision. Prefer explicit interfaces between repositories and preserve engine-specific evidence through adapters.

This broader approach does not automatically replace the previously agreed first delivery: local text observations with locations, crops, uncertainty, saved human review, and exports. Knowledge-guided equipment association and topology reconstruction can build on that foundation. A small prototype may test their value before broader implementation.

## 7. Validate one bounded use case first

Start with one recurring process arrangement and a small, permitted drawing collection. Select the arrangement and corpus explicitly before implementation.

Build a reviewed pattern set and compare:

1. Extraction with the shared behavioral instructions and adaptive viewing, but without the pattern reference package.
2. The same extraction system with explicitly supplied pattern knowledge assisting interpretation and investigation.

Hold the drawings, base extraction components, adaptive-viewing tools and inspection budget, and evaluation method consistent so the comparison measures the contribution of the knowledge layer. Separately compare adaptive viewing with fixed viewing to measure its effect without confusing the two changes. If RAG is later introduced, compare it with the explicit-context baseline and check retrieval misses as well as extraction quality.

Measure correct and missed objects, exact text accuracy, correct and missed connections, invented connections, connection-type and direction errors, unresolved cases, sheet coverage, inspection time, and reviewer effort. Include legitimate exceptions to common patterns so evaluation rewards faithful extraction rather than conformity to expectations.

Use unseen drawings for evaluation. Do not supply or retrieve their answer annotations or derived ground-truth graphs. Drawing variants and closely related source documents should remain grouped when separating development and evaluation data. Using an evaluation drawing's own legend is valid input evidence, not permission to access its answer labels.

Set numerical acceptance criteria before selecting a candidate for release. No accuracy target or improvement is established by this plan.

## 8. Consider training after measuring the knowledge-guided approach

Collect reviewed examples of correct interpretations, mistakes, exceptions, and unresolved cases. Determine whether remaining failures come from perception, viewing coverage, context selection, reasoning, or missing knowledge before choosing a training intervention. Assess retrieval failures separately if RAG has been introduced.

OCR or symbol-model training and agent/model fine-tuning are separate activities. Pattern Markdown alone is not a substitute for labeled visual examples. Fine-tuning is a later option if measured failures justify it; it is not required to begin the explicit-context and adaptive-viewing prototype.

Keep deployed model weights fixed during ordinary review. Evaluate any trained candidate before promotion and retain a reproducible baseline.

## Data boundary

Develop the knowledge library and prototype using public, licensed, or synthetic materials. Confidential drawings, crops, extracted text, knowledge documents, indexes, embeddings, logs, and privately trained weights must remain in the approved local environment. A private deployment must keep retrieval, inference, and storage within that boundary and must not silently fall back to external services.

## Open decisions

- First process arrangement, industry context, and permitted evaluation corpus.
- Authoritative references and engineering review of pattern rationales.
- Pattern-library ownership and integration location.
- Initial instruction/reference package and handling of conflicting references.
- Viewing tools, coverage bookkeeping, and inspection/resource limits.
- Whether library growth justifies RAG, and its implementation if needed.
- Review rules for inferred connections and unresolved topology.
- Evaluation thresholds, resource limits, and any later training budget.

## References

- Existing product scope and delivery sequence: `pid-ocr-training/design.md`.
- OCR review ownership: `pid-ocr-training/docs/adr/0001-ocr-review-in-diagex-workbench.md`.
- [Digitize-PID: Automatic Digitization of Piping and Instrumentation Diagrams](https://arxiv.org/abs/2109.03794): research precedent for component detection and association followed by domain-knowledge-based validation and correction. It does not validate this proposed instruction-based or optional RAG implementation.


### References for equipment arrangements and design rationale

Start with Toghraei for P&ID development; use the other references for physical arrangements, safety rationale, and detailed engineering. These are candidate knowledge sources, not blanket authorization to treat every example as a mandatory rule. Verify the relevant edition and passage before approving a knowledge record.

- [Moe Toghraei, *Piping and Instrumentation Diagram Development*](https://onlinelibrary.wiley.com/doi/book/10.1002/9781119329503): the closest starting point for equipment-specific P&ID provisions, valves, maintenance, controls, and protective devices. The linked first-edition contents identify relevant chapters; select and record the edition actually used.
- [Ed Bausbacher and Roger Hunt, *Process Plant Layout and Piping Design*](https://www.informit.com/store/process-plant-layout-and-piping-design-9780131386297): companion reference for equipment and piping layout, access, operation, and maintenance considerations.
- [CCPS, *Guidelines for Engineering Design for Process Safety*, second edition](https://ccps.aiche.org/publications/books/guidelines-engineering-design-process-safety-2nd-edition): failure scenarios, safety rationale, and design solutions for preventing or mitigating hazardous releases.
- [A. Kayode Coker, *Ludwig's Applied Process Design for Chemical and Petrochemical Plants*, Volume 1, fourth edition](https://shop.elsevier.com/books/ludwigs-applied-process-design-for-chemical-and-petrochemical-plants/coker/978-0-7506-7766-0): supporting engineering methods for flowsheets, piping, fluid flow, and valve design.

Supplement textbook patterns with the actual project's design basis, applicable standards, equipment data, and manufacturer instructions. Keep their applicability and authority explicit in each record.
