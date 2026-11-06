# LangGraph: ICF Section Generation

How `POST /api/v1/sections/generate` executes. Source: `backend/src/services/section_graph.py`.

The short version: the graph is a **single-layer fan-out/fan-in** — `START` → one node per
selected LLM section → `END`. There are no conditional edges, no cycles, and no shared
sequencing between sections. All the interesting work lives *inside* each node (RAG retrieval
+ token streaming) and *around* the graph (boilerplate short-circuit + SSE translation).

---

## 1. The compiled graph

Built by `build_section_graph()` (`section_graph.py:250`). One node per section, named after
the section itself, wired `START → node → END`. LangGraph runs all of them concurrently.

![START fans out to one node per section, each returning to END](diagrams/graph-topology.svg)

<details>
<summary>Mermaid source (for notebooks / GitHub rendering)</summary>

```mermaid
graph LR
    S([START]):::terminus
    S --> N1(Purpose of the Study) --> E
    S --> N2(Study Procedures) --> E
    S --> N3(Risks and Discomforts) --> E
    S --> N4(Benefits) --> E
    S --> N5(Alternatives) --> E
    S --> N6(Confidentiality) --> E
    S --> N7(Costs and Compensation) --> E
    S --> N8(Voluntary Participation) --> E
    S --> N9(Contact Information) --> E
    S --> N10(Genetic Research) --> E
    S --> N11(Sample Storage) --> E
    S --> N12(HIV Testing) --> E
    E([END]):::terminus
    classDef terminus fill:#1c5f8b,color:#ffffff,stroke:#12455f
```

</details>

Node set is **dynamic** — it is whatever LLM-backed sections the user checked for that run.
The 12 above are the maximum (9 standard + 3 conditional). Signature sections never become
nodes; see §3.

State is a single reducer-merged dict:

```python
class SectionGraphState(TypedDict):
    results: Annotated[dict[str, SectionResult], _merge_dicts]
```

The `_merge_dicts` reducer is what makes the fan-in safe: every node returns
`{"results": {section_id: ...}}` and LangGraph merges the concurrent writes instead of
raising `InvalidUpdateError`.

### Reproducing this diagram

Same call you'd make in a notebook:

```python
from src.services.section_graph import build_section_graph

graph = build_section_graph("proto-123", llm_sections, model=None, node_results={})
print(graph.get_graph().draw_mermaid())
# in a notebook:  display(Image(graph.get_graph().draw_mermaid_png()))
```

Verbatim output (LangGraph escapes spaces in node ids as `\20`):

```
graph TD;
	__start__([<p>__start__</p>]):::first
	Purpose\20of\20the\20Study(Purpose of the Study)
	Study\20Procedures(Study Procedures)
	...
	__end__([<p>__end__</p>]):::last
	__start__ --> Alternatives;
	__start__ --> Benefits;
	...
	Alternatives --> __end__;
	Benefits --> __end__;
	...
```

---

## 2. Inside one section node

Every node is a closure produced by `_make_section_node()` (`section_graph.py:200`). This is
where RAG and the LLM call happen — LangGraph itself sees only an opaque async function.

![Inside one section node: retrieval, streaming, error capture](diagrams/node-internals.svg)

<details>
<summary>Mermaid source (for notebooks / GitHub rendering)</summary>

```mermaid
flowchart TD
    A[Node entry] --> B["search_protocol(protocol_id, section_name, k=20)<br/>Qdrant similarity search · text-embedding-3-small<br/>run via asyncio.to_thread"]
    B -->|VectorStoreError / LLMConfigError| E
    B --> C{chunks returned?}
    C -->|no| E["node_results[id] = status error"]
    C -->|yes| D["join chunks into context<br/>_build_messages: SYSTEM_PROMPT + section request"]
    D --> F["async for chunk in model.astream(messages)<br/>accumulate content_parts"]
    F -->|any Exception → logger.warning| E
    F --> G["node_results[id] = content, status ready"]
    G --> H(["return results for section_id"])
    E --> H
```

</details>

Two things worth noting:

- **`node_results` is a side-channel.** The node writes into a plain dict captured by the
  closure *as well as* returning graph state. The streaming loop in §3 reads that dict to
  detect completion, because `astream_events` surfaces node events before the merged state
  is observable.
- **No retries here.** `MAX_RETRIES = 3` applies only to the regenerate path (§4). A failed
  section in the generate path fails once and reports `status: "error"`.

---

## 3. The full request pipeline

`stream_sections_parallel()` (`section_graph.py:263`) wraps the graph. The graph is only one
stage of it.

![The request pipeline that wraps the graph](diagrams/request-pipeline.svg)

<details>
<summary>Mermaid source (for notebooks / GitHub rendering)</summary>

```mermaid
flowchart TD
    REQ(["POST /api/v1/sections/generate"]) --> V{"protocolId non-empty<br/>and sections non-empty?"}
    V -->|no| V422["422 VALIDATION_ERROR"]
    V -->|yes| SPLIT["get_boilerplate(name) per section"]

    SPLIT --> BP["Boilerplate sections<br/>(signature pages)"]
    SPLIT --> LLM["LLM sections<br/>(standard + conditional)"]

    BP --> BPE["Emit instantly, no model call:<br/>section_start → section_chunk → section_complete"]

    LLM --> ANY{"any LLM sections?"}
    ANY -->|no| DONE([stream ends])
    ANY -->|yes| MODEL["get_chat_model(provider, model)"]
    MODEL -->|LLMConfigError| ERRALL["section_start + section_error<br/>for every LLM section"]
    ERRALL --> DONE
    MODEL --> BUILD["build_section_graph(...)<br/>compile StateGraph"]
    BUILD --> STARTS["Emit section_start for all LLM sections upfront"]
    STARTS --> RUN["graph.astream_events, version v2"]

    RUN --> EV{"event type"}
    EV -->|on_chat_model_stream| TOK["metadata.langgraph_node maps to sectionId<br/>emit section_chunk"]
    EV -->|"node id present in node_results"| FIN["emit section_complete or section_error<br/>mark in completed_sections"]
    TOK --> RUN
    FIN --> RUN

    RUN --> NET["Safety net: any LLM section still missing<br/>gets complete/error from node_results"]
    NET --> DONE
    BPE --> DONE
```

</details>

Boilerplate sections are emitted **before** the graph is built, so the client sees signature
pages fill in immediately while the model-backed sections are still streaming.

Which sections are which (`section_definitions.py`):

| Category | Sections | Path |
| --- | --- | --- |
| Standard | Purpose of the Study, Study Procedures, Risks and Discomforts, Benefits, Alternatives, Confidentiality, Costs and Compensation, Voluntary Participation, Contact Information | Graph node (RAG + LLM) |
| Conditional | Genetic Research, Sample Storage, HIV Testing | Graph node (RAG + LLM) |
| Signature | Adult Consent, Teen Assent, Parent/Guardian Permission | Boilerplate, emitted instantly |

A section is boilerplate iff its `SectionDef` carries `boilerplate_text`. Today that is
exactly the three signature sections.

---

## 4. Regeneration is *not* a graph

`POST /api/v1/sections/regenerate` → `stream_section_regenerate()` is a plain linear async
generator, no `StateGraph` involved. It handles one section, adds the current content plus
reviewer guidance to the prompt, and retries up to `MAX_RETRIES = 3` on transient failures.
Boilerplate sections are rejected with 422 before reaching it.

![Regeneration path: linear, retrying, no StateGraph](diagrams/regenerate-path.svg)

<details>
<summary>Mermaid source (for notebooks / GitHub rendering)</summary>

```mermaid
flowchart LR
    A[section_start] --> B["get_chat_model()"] --> C["search_protocol(k=20)"] --> D{chunks?}
    D -->|no| X[section_error]
    D --> E["REGENERATE_SYSTEM_PROMPT<br/>+ protocol context<br/>+ current content<br/>+ guidance"]
    E --> F["model.astream()<br/>up to 3 attempts"]
    F -->|success| G[section_chunk* → section_complete]
    F -->|3 failures| X
```

</details>

---

## SSE event contract

Emitted by `_sse_event()` for both endpoints:

| Event | Payload |
| --- | --- |
| `section_start` | `{sectionId, name}` |
| `section_chunk` | `{sectionId, content}` |
| `section_complete` | `{sectionId, status: "ready"}` |
| `section_error` | `{sectionId, status: "error", message}` |
