import React, { useState, useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import {
  FolderGit2,
  Share2,
  FolderTree,
  Cpu,
  Globe,
  Database,
  Package,
  GraduationCap,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  FileCode,
  Folder,
  AlertCircle,
  Sun,
  Moon,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  Copy,
  Check,
  Bot,
  KeyRound,
  Terminal,
  Layers,
  Code,
  Sparkles,
  ArrowUp,
  PanelLeft,
  PanelLeftClose,
  Plus,
  MessageSquare
} from 'lucide-react';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  suppressErrorRendering: true,
  fontFamily: 'JetBrains Mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
});

const API_BASE = (((import.meta as any).env?.VITE_API_BASE_URL as string) || '').replace(/\/+$/, '');

/**
 * Strips all HTML tags and unescapes entities safely.
 */
function stripHtml(text: string): string {
  if (!text) return '';
  return text
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/?[a-zA-Z][a-zA-Z0-9]*(?:\s+[^>]*)?\/?>/g, ' ')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Parses inline markdown: bold, italic, code pills, and arrows.
 */
function renderInlineText(raw: string, isDark: boolean): React.ReactNode[] {
  if (!raw) return [];

  const text = raw
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/?[a-zA-Z][a-zA-Z0-9]*(?:\s+[^>]*)?\/?>/g, ' ')
    .replace(/\s*-->\s*/g, ' â†’ ')
    .replace(/\s*->\s*/g, ' â†’ ');

  const codeParts = text.split(/(`[^`]+`)/g);
  const nodes: React.ReactNode[] = [];
  let keyIndex = 0;

  for (const part of codeParts) {
    if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
      const codeVal = part.slice(1, -1).trim();
      nodes.push(
        <code
          key={`code-${keyIndex++}`}
          className={`px-1.5 py-0.5 mx-0.5 rounded text-[11px] font-mono font-medium border ${
            isDark
              ? 'bg-[#1e1e1e] text-emerald-400 border-white/10'
              : 'bg-slate-100 text-emerald-700 border-slate-200'
          }`}
        >
          {codeVal}
        </code>
      );
      continue;
    }

    const boldParts = part.split(/(\*\*[^*]+\*\*|__[^_]+__)/g);

    for (const bPart of boldParts) {
      if ((bPart.startsWith('**') && bPart.endsWith('**')) || (bPart.startsWith('__') && bPart.endsWith('__'))) {
        const boldVal = bPart.slice(2, -2).replace(/[*_]/g, '').trim();
        nodes.push(
          <strong key={`b-${keyIndex++}`} className={`font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
            {boldVal}
          </strong>
        );
        continue;
      }

      const italicParts = bPart.split(/(?:^|[^\w])(\*[^*]+\*|_[^_]+_)(?:$|[^\w])/g);

      for (const iPart of italicParts) {
        if ((iPart.startsWith('*') && iPart.endsWith('*') && iPart.length > 2) ||
            (iPart.startsWith('_') && iPart.endsWith('_') && iPart.length > 2)) {
          const italicVal = iPart.slice(1, -1).replace(/[*_]/g, '').trim();
          nodes.push(
            <em key={`i-${keyIndex++}`} className={`italic ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
              {italicVal}
            </em>
          );
          continue;
        }

        const cleanedPlain = iPart
          .replace(/[*_`>#]/g, '')
          .replace(/&gt;/g, '>')
          .replace(/&lt;/g, '<');

        if (cleanedPlain) {
          nodes.push(<React.Fragment key={`t-${keyIndex++}`}>{cleanedPlain}</React.Fragment>);
        }
      }
    }
  }

  return nodes;
}

let mermaidSeq = 0;

/**
 * Interactive Mermaid Architecture Diagram Viewer.
 */
function MermaidChart({ chart, title, isDark = true }: { chart?: string; title?: string; isDark?: boolean }) {
  const [svgContent, setSvgContent] = useState<string>('');
  const [renderError, setRenderError] = useState<string | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [copied, setCopied] = useState<boolean>(false);
  const [showRaw, setShowRaw] = useState<boolean>(false);

  useEffect(() => {
    let isCancelled = false;
    const seq = ++mermaidSeq;

    const renderDiagram = async () => {
      const code = (chart || '').trim();
      if (!code) {
        if (!isCancelled) {
          setSvgContent('');
          setRenderError(null);
        }
        return;
      }
      setRenderError(null);

      // Clean common syntax edge-cases across versions safely
      const cleanCode = code
        .replace(/&/g, 'and')
        .replace(/\|"([^"]+)"\|/g, '|$1|')
        .replace(/-\.->\|"([^"]+)"\|/g, '-.->|$1|')
        .replace(/-->\|"([^"]+)"\|/g, '-->|$1|')
        .replace(/\\n/g, '<br/>')
        .trim();

      const id = 'mmd_' + seq + '_' + Math.random().toString(36).substring(2, 8);

      try {
        const { svg } = await mermaid.render(id, cleanCode);
        if (!isCancelled) {
          setSvgContent(svg);
          setRenderError(null);
        }
      } catch (err: any) {
        console.warn('Initial Mermaid render warning, attempting fallback render:', err);
        try {
          const fallbackCode = cleanCode
            .replace(/classDef.*$/gm, '')
            .replace(/:::[\w]+/g, '')
            .trim();
          const fallbackId = 'mmd_fb_' + seq + '_' + Math.random().toString(36).substring(2, 8);
          const { svg: fbSvg } = await mermaid.render(fallbackId, fallbackCode);
          if (!isCancelled) {
            setSvgContent(fbSvg);
            setRenderError(null);
          }
        } catch (e2: any) {
          console.error('All Mermaid render attempts failed:', e2);
          if (!isCancelled) {
            setRenderError(err?.message || 'Syntax error rendering diagram');
            setSvgContent('');
          }
        }
      }
    };

    renderDiagram();

    return () => {
      isCancelled = true;
    };
  }, [chart]);

  const handleCopy = () => {
    if (!chart) return;
    navigator.clipboard.writeText(chart);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className={`rounded-2xl border overflow-hidden shadow-xl ${
      isDark ? 'bg-[#181818] border-white/10' : 'bg-slate-50 border-slate-200'
    }`}>
      <div className={`px-4 py-3 border-b flex items-center justify-between ${
        isDark ? 'bg-[#212121] border-white/10' : 'bg-white border-slate-200'
      }`}>
        <div className="flex items-center space-x-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
          <span className={`text-xs font-semibold font-mono tracking-tight ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
            {title || 'Repository Architecture Topology'}
          </span>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setZoom(z => Math.max(0.4, z - 0.15))}
            className={`p-1.5 rounded-lg transition ${
              isDark ? 'hover:bg-white/10 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
            }`}
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className={`text-[11px] font-mono px-1 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(z => Math.min(2.5, z + 0.15))}
            className={`p-1.5 rounded-lg transition ${
              isDark ? 'hover:bg-white/10 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
            }`}
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className={`px-2 py-1 rounded-lg text-[11px] font-mono transition ${
              isDark ? 'hover:bg-white/10 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
            }`}
            title="Reset Zoom"
          >
            Reset
          </button>
          <button
            onClick={handleCopy}
            className={`p-1.5 rounded-lg transition flex items-center space-x-1 ${
              isDark ? 'hover:bg-white/10 text-slate-300' : 'hover:bg-slate-100 text-slate-600'
            }`}
            title="Copy Mermaid Source"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className={`p-6 overflow-auto flex items-center justify-center min-h-[380px] transition-all ${
        isDark ? 'bg-[#181818]' : 'bg-slate-50'
      }`}>
        {svgContent ? (
          <div
            style={{ transform: `scale(${zoom})`, transformOrigin: 'top center', transition: 'transform 0.15s ease-out' }}
            className="w-full flex justify-center [&>svg]:max-w-full [&>svg]:h-auto"
            dangerouslySetInnerHTML={{ __html: svgContent }}
          />
        ) : renderError ? (
          <div className="text-center p-6 space-y-3">
            <div className="text-xs font-mono text-rose-400">Unable to render visual topology: {renderError}</div>
            <button
              onClick={() => setShowRaw(true)}
              className="text-xs text-slate-400 hover:text-white underline font-mono"
            >
              Inspect Mermaid Source
            </button>
          </div>
        ) : (
          <div className="flex items-center space-x-2 text-xs text-slate-500 font-mono">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
            <span>Generating architecture diagram...</span>
          </div>
        )}
      </div>

      {showRaw && (
        <div className={`p-4 border-t font-mono text-xs overflow-x-auto ${
          isDark ? 'bg-[#121212] border-white/10 text-slate-300' : 'bg-slate-100 border-slate-200 text-slate-700'
        }`}>
          <div className="flex justify-between items-center mb-2">
            <span className="font-semibold text-emerald-500">Mermaid Raw Source:</span>
            <button
              onClick={() => setShowRaw(false)}
              className="text-[11px] text-slate-400 hover:text-white underline"
            >
              Close
            </button>
          </div>
          <pre className="whitespace-pre">{chart}</pre>
        </div>
      )}
    </div>
  );
}

/**
 * Modern ChatGPT-style Markdown & Code Block Viewer.
 */
function MarkdownViewer({ content, isDark = true }: { content: string; isDark?: boolean }) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!content) return null;

  const blocks = content.split(/(```[\s\S]*?```)/g);

  const handleCopy = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className="space-y-3">
      {blocks.map((block, blockIdx) => {
        // Fenced Code Block
        if (block.startsWith('```') && block.endsWith('```')) {
          const lines = block.slice(3, -3).trim().split('\n');
          const firstLine = lines[0]?.trim() || '';
          const hasLang = /^[a-zA-Z0-9_-]+$/.test(firstLine);
          const language = (hasLang ? firstLine : 'code').toLowerCase();
          const codeString = hasLang ? lines.slice(1).join('\n') : lines.join('\n');
          const trimmedCode = codeString.trim();

          const isMermaid =
            language === 'mermaid' ||
            trimmedCode.startsWith('flowchart') ||
            trimmedCode.startsWith('graph ') ||
            trimmedCode.startsWith('sequenceDiagram') ||
            trimmedCode.startsWith('classDiagram') ||
            trimmedCode.startsWith('erDiagram') ||
            trimmedCode.startsWith('stateDiagram');

          if (isMermaid) {
            return (
              <div key={blockIdx} className="my-3">
                <MermaidChart chart={codeString} title="Gitly AI Generated Diagram" isDark={isDark} />
              </div>
            );
          }

          return (
            <div
              key={blockIdx}
              className={`rounded-xl overflow-hidden border my-3 font-mono text-xs shadow-md ${
                isDark ? 'border-white/10 bg-[#1e1e1e]' : 'border-slate-300 bg-slate-900 text-slate-100'
              }`}
            >
              <div
                className={`px-3.5 py-2 border-b flex items-center justify-between text-[11px] ${
                  isDark ? 'border-white/10 bg-[#262626] text-slate-400' : 'border-slate-800 bg-slate-800 text-slate-400'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="font-semibold uppercase tracking-wider text-slate-300">{language}</span>
                </div>
                <button
                  onClick={() => handleCopy(codeString, blockIdx)}
                  className={`px-2.5 py-1 rounded text-[11px] flex items-center space-x-1.5 border transition ${
                    isDark
                      ? 'border-white/10 hover:bg-white/10 text-slate-300'
                      : 'border-slate-700 hover:bg-slate-700 text-slate-200'
                  }`}
                >
                  {copiedIndex === blockIdx ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400 font-medium">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy code</span>
                    </>
                  )}
                </button>
              </div>
              <pre className="p-3.5 overflow-x-auto leading-relaxed text-slate-200 selection:bg-emerald-500/30">
                {codeString}
              </pre>
            </div>
          );
        }

        // Prose lines
        const lines = block.split(/\r?\n/);
        return (
          <div key={blockIdx} className="space-y-2">
            {lines.map((rawLine, lIdx) => {
              const trimmed = rawLine.trim();
              if (!trimmed) return null;

              // Headings
              const headMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
              if (headMatch) {
                const level = headMatch[1].length;
                const titleText = headMatch[2].replace(/[#*`]/g, '').trim();
                return (
                  <div key={lIdx} className="pt-2 pb-0.5">
                    <div
                      className={`font-semibold tracking-tight ${
                        level === 1
                          ? `text-base ${isDark ? 'text-white' : 'text-slate-900'} border-b ${isDark ? 'border-white/10' : 'border-slate-200'} pb-1`
                          : level === 2
                          ? `text-sm ${isDark ? 'text-white' : 'text-slate-900'}`
                          : `text-xs ${isDark ? 'text-slate-200' : 'text-slate-800'}`
                      }`}
                    >
                      {titleText}
                    </div>
                  </div>
                );
              }

              // Blockquote
              if (trimmed.startsWith('>')) {
                const quoteText = trimmed.replace(/^>\s*/, '');
                return (
                  <div
                    key={lIdx}
                    className={`pl-3.5 py-1 border-l-2 text-xs italic ${
                      isDark ? 'border-emerald-500 text-slate-300 bg-white/[0.02]' : 'border-emerald-500 text-slate-700 bg-emerald-50/50'
                    }`}
                  >
                    {renderInlineText(quoteText, isDark)}
                  </div>
                );
              }

              // Bullet List
              const bulletMatch = trimmed.match(/^([-*â€¢])\s+(.+)$/);
              if (bulletMatch) {
                return (
                  <div key={lIdx} className="flex items-start space-x-2 pl-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                    <div className={`text-xs leading-relaxed flex-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      {renderInlineText(bulletMatch[2], isDark)}
                    </div>
                  </div>
                );
              }

              // Numbered List
              const numMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
              if (numMatch) {
                return (
                  <div key={lIdx} className="flex items-start space-x-2 pl-1">
                    <span
                      className={`w-4 h-4 rounded text-[10px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                        isDark ? 'bg-[#2a2a2a] text-emerald-400 border border-white/10' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {numMatch[1]}
                    </span>
                    <div className={`text-xs leading-relaxed flex-1 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                      {renderInlineText(numMatch[2], isDark)}
                    </div>
                  </div>
                );
              }

              // Standard Paragraph
              return (
                <p key={lIdx} className={`text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                  {renderInlineText(trimmed, isDark)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

/**
 * File tree item for the repository explorer
 */
function FileTreeItem({
  node,
  onSelect,
  selectedPath,
  isDark
}: {
  node: any;
  onSelect: (node: any) => void;
  selectedPath?: string;
  isDark: boolean;
}) {
  const [open, setOpen] = useState(false);
  const isDir = Boolean(node.children);
  const isSelected = selectedPath === node.path;

  return (
    <div className="text-xs">
      <div
        onClick={() => {
          if (isDir) setOpen(!open);
          onSelect(node);
        }}
        className={`flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs font-mono cursor-pointer transition select-none ${
          isSelected
            ? isDark
              ? 'bg-[#2f2f2f] text-emerald-400 font-medium'
              : 'bg-emerald-50 text-emerald-700 font-medium'
            : isDark
            ? 'hover:bg-white/[0.06] text-slate-300'
            : 'hover:bg-slate-100 text-slate-700'
        }`}
      >
        {isDir ? (
          <div className="flex items-center space-x-1 shrink-0">
            {open ? <ChevronDown className="w-3.5 h-3.5 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />}
            <Folder className="w-3.5 h-3.5 text-amber-400" />
          </div>
        ) : (
          <FileCode className="w-3.5 h-3.5 text-slate-400 ml-4 shrink-0" />
        )}
        <span className="truncate">{node.name}</span>
        {node.sizeFormatted && <span className="text-[10px] text-slate-400 ml-auto shrink-0">{node.sizeFormatted}</span>}
      </div>

      {isDir && open && node.children && (
        <div className={`pl-4 ml-2 border-l space-y-0.5 mt-0.5 ${isDark ? 'border-white/10' : 'border-slate-200'}`}>
          {node.children.map((child: any, idx: number) => (
            <FileTreeItem
              key={idx}
              node={child}
              onSelect={onSelect}
              selectedPath={selectedPath}
              isDark={isDark}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function App() {
  const [isDark, setIsDark] = useState(true);
  const [repoUrl, setRepoUrl] = useState('');
  const [branch, setBranch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any | null>(null);

  const [showKeyInput, setShowKeyInput] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [geminiActive, setGeminiActive] = useState(false);

  // Default to 'chat' (Gitly AI) when a repository is analyzed
  const [activeTab, setActiveTab] = useState<
    'chat' | 'architecture' | 'database' | 'explorer' | 'overview'
  >('chat');

  // Left sidebar toggle for ChatGPT view
  const [sidebarOpen, setSidebarOpen] = useState(true);

  const [selectedFileNode, setSelectedFileNode] = useState<any | null>(null);

  // ChatGPT State
  const [chatMessages, setChatMessages] = useState<
    Array<{ role: 'user' | 'assistant'; text: string; thoughts?: string[]; files?: string[]; engine?: string }>
  >([]);
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Check backend health & Gemini status on load
  useEffect(() => {
    fetch(`${API_BASE}/api/v1/repositories/health`)
      .then(r => r.json())
      .then(d => {
        if (d && d.geminiConfigured) setGeminiActive(true);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages, chatLoading]);

  const handleSaveApiKey = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/api/v1/repositories/config/api-key`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: apiKeyInput.trim() })
      });
      const data = await res.json();
      setGeminiActive(Boolean(data.geminiConfigured));
      setShowKeyInput(false);
    } catch (err) {
      console.error(err);
    }
  };

  const handleAnalyze = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!repoUrl.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API_BASE}/api/v1/repositories/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ repositoryUrl: repoUrl.trim(), branch: branch.trim() || undefined })
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to analyze repository');
      }
      setAnalysis(data);
      if (data.fileTree && data.fileTree.length > 0) {
        setSelectedFileNode(data.fileTree[0]);
      }
      // Always open in ChatGPT (Gitly AI) interface
      setActiveTab('chat');
      // Initialize first welcome message
      setChatMessages([
        {
          role: 'assistant',
          thoughts: data.agentThinkingSteps || [
            `Scanned ${data.totalFiles} files across ${data.totalDirectories} directories`,
            `Identified primary language: ${Object.keys(data.languageDistribution || {})[0] || 'Unknown'}`,
            `Mapped architecture into interactive visual topology`
          ],
          text: `👋 Welcome! I am **Gitly AI**, your codebase intelligence copilot for **${data.repositoryName}**.\n\n`
            + `- **Language Stack:** ${Object.keys(data.languageDistribution || {}).join(', ') || 'Multi-language'}\n`
            + `- **Frameworks:** ${(data.detectedFrameworks || []).join(', ') || 'Standard'}\n`
            + `- **Persistence:** ${data.databaseInfo?.databaseTechnology || 'Application State'}\n\n`
            + `Ask me anything about this repository, request interactive architecture diagrams, or pick a deep-dive topic to explore:`
        }
      ]);
    } catch (err: any) {
      setError(err.message || 'Could not analyze repository');
    } finally {
      setLoading(false);
    }
  };

  const askQuestion = async (questionText: string) => {
    if (!questionText.trim() || !analysis) return;

    const userMsg = questionText.trim();
    setChatMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setChatQuestion('');
    setChatLoading(true);

    try {
      const history = chatMessages.map(m => ({ role: m.role, text: m.text }));

      const res = await fetch(`${API_BASE}/api/v1/repositories/${analysis.repositoryId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: userMsg,
          history: history.slice(-6),
          apiKey: apiKeyInput.trim() || undefined
        })
      });
      const data = await res.json();
      if (res.ok) {
        setChatMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            text: data.answer,
            thoughts: data.agentThoughts,
            files: data.referencedFiles,
            engine: data.engine
          }
        ]);
      } else {
        setChatMessages(prev => [
          ...prev,
          { role: 'assistant', text: 'Error: ' + (data.message || 'Failed to get answer from AI service.') }
        ]);
      }
    } catch (err: any) {
      setChatMessages(prev => [...prev, { role: 'assistant', text: 'Network connection failed. Please verify backend is running.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    askQuestion(chatQuestion);
  };

  const handleResetToNewChat = () => {
    if (!analysis) return;
    setChatMessages([
      {
        role: 'assistant',
        text: `👋 New conversation started for **${analysis.repositoryName}**. Ask me any question about the codebase, request diagrams, or select a topic to begin.`
      }
    ]);
  };

  const handleSwitchRepo = () => {
    setAnalysis(null);
    setRepoUrl('');
    setBranch('');
    setChatMessages([]);
    setError(null);
  };

  // Deep-dive prompts configured as default questions in AI chat (replacing old tabs)
  const defaultQuestions = [
    {
      id: 'diagram',
      title: 'Architecture Diagram',
      description: 'Generate interactive Mermaid architecture & data flow',
      icon: Share2,
      prompt: 'Generate a detailed Mermaid diagram illustrating the end-to-end data flow and architecture of this repository.'
    },
    {
      id: 'components',
      title: 'Components & Structure',
      description: 'Explore primary source modules, layers, and responsibilities',
      icon: Cpu,
      prompt: 'Break down the core components, modules, and folder architecture of this repository and their responsibilities.'
    },
    {
      id: 'apis',
      title: 'APIs, Routes & Handlers',
      description: 'Inspect all endpoints, HTTP controllers, and functions',
      icon: Globe,
      prompt: 'List all API endpoints, routes, controllers, and functions discovered in this repository with their methods, parameters, and roles.'
    },
    {
      id: 'database',
      title: 'Database & Data Models',
      description: 'Examine collections, entities, schemas, and persistence flow',
      icon: Database,
      prompt: 'Explain the database models, collections, persistence layer, and data query flows configured in this repository.'
    },
    {
      id: 'dependencies',
      title: 'Dependencies & Tech Stack',
      description: 'Audit external packages, frameworks, and runtime libraries',
      icon: Package,
      prompt: 'Audit all external dependencies, libraries, and frameworks used in this project and explain what each is used for.'
    },
    {
      id: 'onboarding',
      title: '5-Day Onboarding Guide',
      description: 'Get local setup commands, architecture model, and 5-day plan',
      icon: GraduationCap,
      prompt: 'Generate a comprehensive 5-day developer onboarding guide: prerequisites, local setup steps, architecture mental model, and how to make the first code contribution.'
    }
  ];

  const navTabs = [
    { id: 'chat', label: 'Gitly AI', icon: Sparkles, count: null },
    { id: 'architecture', label: 'Architecture', icon: Share2, count: null },
    { id: 'database', label: 'Data Models', icon: Database, count: analysis?.databaseInfo?.detectedModels?.length || null },
    { id: 'explorer', label: 'Files', icon: FolderTree, count: analysis?.totalFiles || null },
    { id: 'overview', label: 'Overview', icon: Layers, count: null }
  ] as const;

  return (
    <div className={`min-h-screen flex flex-col font-sans transition-colors duration-150 ${
      isDark ? 'bg-[#212121] text-[#ececec]' : 'bg-[#ffffff] text-[#0d0d0d]'
    }`}>
      {/* Top Application Bar */}
      <header className={`px-4 py-2.5 border-b flex items-center justify-between gap-4 sticky top-0 z-30 transition-colors ${
        isDark ? 'bg-[#171717] border-white/10' : 'bg-[#ffffff] border-slate-200'
      }`}>
        {/* Left: Brand & Sidebar Toggle */}
        <div className="flex items-center space-x-3 shrink-0">
          {analysis && (
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={`p-1.5 rounded-lg border transition ${
                isDark ? 'border-white/10 hover:bg-[#2f2f2f] text-slate-300' : 'border-slate-200 hover:bg-slate-100 text-slate-700'
              }`}
              title={sidebarOpen ? 'Collapse Sidebar' : 'Open Sidebar'}
            >
              {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
            </button>
          )}

          <div className="flex items-center space-x-2.5 cursor-pointer" onClick={() => analysis && setActiveTab('chat')}>
            <div className="w-7 h-7 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-sm">
              <Bot className="w-4 h-4" />
            </div>
            <div className="flex items-center space-x-1.5">
              <span className={`font-semibold text-sm tracking-tight ${isDark ? 'text-white' : 'text-slate-900'}`}>Gitly</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-emerald-500/15 text-emerald-500 font-semibold border border-emerald-500/20">
                AI
              </span>
            </div>
          </div>

          {/* Active Repository Pill */}
          {analysis && (
            <div className="hidden sm:flex items-center space-x-2 pl-3 border-l border-white/10">
              <span className={`text-xs font-mono font-medium truncate max-w-xs ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                {analysis.repositoryName}
              </span>
              <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded ${
                isDark ? 'bg-[#2f2f2f] text-slate-400' : 'bg-slate-100 text-slate-600'
              }`}>
                {analysis.branch || 'main'}
              </span>
              <button
                onClick={handleSwitchRepo}
                className={`text-[11px] font-mono underline ml-1 transition ${
                  isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Switch
              </button>
            </div>
          )}
        </div>

        {/* Center: Clean Navbar Tabs for Analyzed State */}
        {analysis && (
          <nav className="flex items-center space-x-1 overflow-x-auto">
            {navTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition ${
                    isActive
                      ? isDark
                        ? 'bg-[#2f2f2f] text-white font-semibold'
                        : 'bg-slate-100 text-slate-900 font-semibold'
                      : isDark
                      ? 'text-slate-400 hover:text-slate-200 hover:bg-[#2f2f2f]/50'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-500' : ''}`} />
                  <span>{tab.label}</span>
                  {tab.count !== null && (
                    <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full ${
                      isActive
                        ? isDark ? 'bg-white/10 text-slate-200' : 'bg-slate-200 text-slate-700'
                        : isDark ? 'bg-white/5 text-slate-400' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        )}

        {/* Right: API Key & Theme Controls */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => setShowKeyInput(!showKeyInput)}
            className={`px-2.5 py-1.5 rounded-lg text-xs font-mono border transition flex items-center space-x-1.5 ${
              geminiActive
                ? isDark
                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                  : 'border-emerald-500/40 bg-emerald-50 text-emerald-700'
                : isDark
                ? 'border-white/10 hover:bg-[#2f2f2f] text-slate-400 hover:text-slate-200'
                : 'border-slate-200 hover:bg-slate-100 text-slate-600'
            }`}
            title="Configure Gemini API Key"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span className="hidden md:inline">{geminiActive ? 'Gemini Active' : 'Set Gemini Key'}</span>
            <span className={`w-1.5 h-1.5 rounded-full ${geminiActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          </button>

          <button
            onClick={() => setIsDark(!isDark)}
            className={`p-1.5 rounded-lg border transition ${
              isDark ? 'border-white/10 hover:bg-[#2f2f2f] text-slate-400' : 'border-slate-200 hover:bg-slate-100 text-slate-600'
            }`}
            title={isDark ? 'Switch to Light theme' : 'Switch to Dark theme'}
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
          </button>
        </div>
      </header>

      {/* Gemini API Key Drawer / Modal */}
      {showKeyInput && (
        <form onSubmit={handleSaveApiKey} className={`px-5 py-2.5 border-b flex items-center justify-between gap-4 text-xs animate-in slide-in-from-top ${
          isDark ? 'bg-[#1e1e1e] border-white/10' : 'bg-slate-50 border-slate-200'
        }`}>
          <div className={`flex items-center space-x-2.5 ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
            <KeyRound className="w-4 h-4 text-emerald-500" />
            <span><strong>Gemini API Key:</strong> Enter your key for live real-time AI reasoning:</span>
          </div>
          <div className="flex items-center space-x-2">
            <input
              type="password"
              value={apiKeyInput}
              onChange={e => setApiKeyInput(e.target.value)}
              placeholder="AIzaSy..."
              className={`rounded-lg px-3 py-1.5 text-xs font-mono border focus:outline-none focus:ring-1 focus:ring-emerald-500 w-64 ${
                isDark ? 'bg-[#2a2a2a] border-white/10 text-white' : 'bg-white border-slate-300 text-slate-900'
              }`}
            />
            <button
              type="submit"
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition"
            >
              Save Key
            </button>
            <button
              type="button"
              onClick={() => setShowKeyInput(false)}
              className="text-slate-400 hover:text-white text-xs px-2 py-1.5"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* 1. MINIMALIST CHATGPT LANDING PAGE (When no repository is analyzed yet)  */}
      {/* ========================================================================= */}
      {!analysis ? (
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-2xl mx-auto w-full">
          {/* Centered Brand Mark */}
          <div className="w-14 h-14 rounded-2xl bg-emerald-600 flex items-center justify-center text-white mb-6 shadow-xl shadow-emerald-500/20">
            <Bot className="w-8 h-8" />
          </div>

          <h1 className={`text-2xl md:text-3xl font-semibold tracking-tight mb-2 ${
            isDark ? 'text-[#ececec]' : 'text-[#0d0d0d]'
          }`}>
            What repository do you want to explore?
          </h1>

          <p className={`text-xs md:text-sm max-w-md mx-auto mb-8 leading-relaxed ${
            isDark ? 'text-[#b4b4b4]' : 'text-[#707070]'
          }`}>
            Enter any public GitHub repository to analyze its architecture, data models, and chat with Gitly AI.
          </p>

          {/* Minimalist ChatGPT Centered Prompt Input Pill */}
          <form
            onSubmit={handleAnalyze}
            className={`w-full rounded-3xl border p-2 flex items-center gap-2 shadow-lg transition-all ${
              isDark
                ? 'bg-[#2f2f2f] border-white/10 focus-within:border-white/20'
                : 'bg-white border-[#e5e5e5] focus-within:border-slate-400 shadow-md'
            }`}
          >
            <div className="pl-3 text-slate-400 shrink-0">
              <FolderGit2 className="w-5 h-5" />
            </div>

            <input
              type="text"
              required
              value={repoUrl}
              onChange={e => setRepoUrl(e.target.value)}
              placeholder="Paste GitHub repository URL (e.g. https://github.com/owner/repo)"
              className={`flex-1 bg-transparent px-2 py-2 text-xs md:text-sm focus:outline-none ${
                isDark ? 'text-[#ececec] placeholder-[#8e8ea0]' : 'text-[#0d0d0d] placeholder-[#8e8ea0]'
              }`}
            />

            <input
              type="text"
              value={branch}
              onChange={e => setBranch(e.target.value)}
              placeholder="branch (opt)"
              className={`w-24 bg-transparent px-2 py-1.5 text-xs font-mono rounded-lg border focus:outline-none ${
                isDark
                  ? 'border-white/10 text-slate-300 placeholder-slate-500'
                  : 'border-slate-200 text-slate-700 placeholder-slate-400'
              }`}
            />

            <button
              type="submit"
              disabled={loading || !repoUrl.trim()}
              className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 ${
                repoUrl.trim() && !loading
                  ? isDark
                    ? 'bg-white text-black hover:bg-slate-200'
                    : 'bg-black text-white hover:bg-slate-800'
                  : isDark
                  ? 'bg-[#3e3f4b] text-slate-500 cursor-not-allowed'
                  : 'bg-slate-200 text-slate-400 cursor-not-allowed'
              }`}
              title="Analyze Repository"
            >
              {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ArrowUp className="w-4 h-4" />}
            </button>
          </form>

          {/* Loading Indicator */}
          {loading && (
            <div className={`mt-6 p-4 rounded-2xl border flex items-center space-x-3 text-xs animate-pulse ${
              isDark ? 'bg-[#2a2a2a] border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}>
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-500 shrink-0" />
              <div className="text-left font-mono">
                <div className="font-semibold text-emerald-500">Cloning repository & analyzing architecture...</div>
                <div className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                  Parsing files, extracting layers, and configuring Gitly AI copilot...
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mt-6 p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2 text-left font-mono">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
              <span>{error}</span>
            </div>
          )}
        </main>
      ) : (
        /* ========================================================================= */
        /* 2. REPOSITORY ANALYZED INTERFACE                                          */
        /* ========================================================================= */
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Active Tab Content */}
          <div className="flex-1 flex overflow-hidden">
            {/* ------------------------------------------------------------------- */}
            {/* TAB 1: EXACT CHATGPT UI FOR GITLY AI                                */}
            {/* ------------------------------------------------------------------- */}
            {activeTab === 'chat' && (
              <div className="flex-1 flex w-full h-[calc(100vh-53px)] overflow-hidden">
                {/* Left Collapsible ChatGPT Sidebar */}
                {sidebarOpen && (
                  <aside className={`w-64 md:w-72 border-r flex flex-col shrink-0 transition-all ${
                    isDark ? 'bg-[#171717] border-white/10' : 'bg-[#f9f9f9] border-slate-200'
                  }`}>
                    {/* Top: New Chat Button */}
                    <div className="p-3 border-b border-white/5">
                      <button
                        onClick={handleResetToNewChat}
                        className={`w-full py-2 px-3 rounded-xl border flex items-center justify-between text-xs font-medium transition ${
                          isDark
                            ? 'border-white/10 hover:bg-[#212121] text-white'
                            : 'border-slate-300 hover:bg-white text-slate-800 shadow-sm'
                        }`}
                      >
                        <span className="flex items-center space-x-2">
                          <Plus className="w-4 h-4 text-emerald-500" />
                          <span>New chat</span>
                        </span>
                        <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                      </button>
                    </div>

                    {/* Explore Codebase Prompts (Requested to replace old tabs) */}
                    <div className="flex-1 overflow-y-auto p-3 space-y-1">
                      <div className={`px-2 py-1 text-[11px] font-semibold uppercase tracking-wider font-mono ${
                        isDark ? 'text-slate-400' : 'text-slate-500'
                      }`}>
                        Deep Dives
                      </div>
                      {defaultQuestions.map(item => {
                        const Icon = item.icon;
                        return (
                          <button
                            key={item.id}
                            onClick={() => askQuestion(item.prompt)}
                            className={`w-full text-left p-2 rounded-xl text-xs flex items-center space-x-2.5 transition group ${
                              isDark
                                ? 'hover:bg-[#212121] text-slate-300 hover:text-white'
                                : 'hover:bg-white text-slate-700 hover:text-slate-950 hover:shadow-sm'
                            }`}
                          >
                            <Icon className="w-4 h-4 text-emerald-500 shrink-0 group-hover:scale-110 transition-transform" />
                            <div className="truncate flex-1">
                              <div className="font-medium truncate">{item.title}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {/* Sidebar Footer: Repo Metadata */}
                    <div className={`p-3 border-t text-[11px] font-mono space-y-1.5 ${
                      isDark ? 'border-white/10 bg-[#141414] text-slate-400' : 'border-slate-200 bg-slate-100/60 text-slate-600'
                    }`}>
                      <div className="flex items-center justify-between">
                        <span className="font-semibold truncate text-slate-300">{analysis.repositoryName}</span>
                        <a
                          href={analysis.repositoryUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="hover:text-emerald-500 flex items-center space-x-1"
                          title="Open on GitHub"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {analysis.totalFiles} files â€¢ {Object.keys(analysis.languageDistribution || {})[0] || 'Code'}
                      </div>
                    </div>
                  </aside>
                )}

                {/* Center Conversation Stream & Floating Prompt Dock */}
                <main className={`flex-1 flex flex-col h-full overflow-hidden relative ${
                  isDark ? 'bg-[#212121]' : 'bg-[#ffffff]'
                }`}>
                  {/* Messages Scroll Area */}
                  <div className="flex-1 overflow-y-auto px-4 py-6">
                    <div className="max-w-3xl mx-auto space-y-6">
                      {chatMessages.length === 1 && chatMessages[0].role === 'assistant' ? (
                        /* Starter ChatGPT Screen with Quick Prompt Cards */
                        <div className="py-8 space-y-8 text-center">
                          <div className="w-12 h-12 rounded-2xl bg-emerald-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-emerald-500/20">
                            <Bot className="w-7 h-7" />
                          </div>

                          <div>
                            <h2 className={`text-xl font-semibold mb-1 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              What would you like to know about {analysis.repositoryName}?
                            </h2>
                            <p className={`text-xs ${isDark ? 'text-slate-400' : 'text-slate-600'}`}>
                              Ask architectural questions, request visual system diagrams, or click any prompt below.
                            </p>
                          </div>

                          {/* 4 Clean ChatGPT Suggestion Cards */}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
                            {defaultQuestions.slice(0, 4).map(card => {
                              const Icon = card.icon;
                              return (
                                <button
                                  key={card.id}
                                  onClick={() => askQuestion(card.prompt)}
                                  className={`p-3.5 rounded-2xl border text-left transition hover:scale-[1.01] flex flex-col justify-between space-y-2 ${
                                    isDark
                                      ? 'bg-[#2f2f2f]/60 hover:bg-[#2f2f2f] border-white/10 text-slate-200'
                                      : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800 shadow-sm'
                                  }`}
                                >
                                  <div className="flex items-center space-x-2">
                                    <Icon className="w-4 h-4 text-emerald-500" />
                                    <span className="font-semibold text-xs">{card.title}</span>
                                  </div>
                                  <div className={`text-[11px] leading-relaxed ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
                                    {card.description}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        /* Normal Conversation Message Flow */
                        chatMessages.map((m, idx) => (
                          <div
                            key={idx}
                            className={`flex items-start gap-4 ${
                              m.role === 'user' ? 'justify-end' : 'justify-start'
                            }`}
                          >
                            {m.role === 'assistant' && (
                              <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-sm">
                                <Bot className="w-4 h-4" />
                              </div>
                            )}

                            <div
                              className={`leading-relaxed text-xs md:text-sm ${
                                m.role === 'user'
                                  ? isDark
                                    ? 'bg-[#2f2f2f] text-[#ececec] rounded-3xl px-5 py-3 max-w-xl'
                                    : 'bg-[#f4f4f4] text-[#0d0d0d] rounded-3xl px-5 py-3 max-w-xl'
                                  : 'flex-1 max-w-3xl'
                              }`}
                            >
                              {/* Assistant Reasoning Accordion */}
                              {m.thoughts && m.thoughts.length > 0 && (
                                <details className="mb-3 border-b border-white/10 pb-2 text-xs group">
                                  <summary className={`cursor-pointer font-mono flex items-center space-x-2 select-none ${
                                    isDark ? 'text-slate-400 hover:text-emerald-400' : 'text-slate-500 hover:text-emerald-600'
                                  }`}>
                                    <Sparkles className="w-3.5 h-3.5 text-emerald-500" />
                                    <span>Thought for {m.thoughts.length} steps</span>
                                    <ChevronRight className="w-3.5 h-3.5 transition-transform group-open:rotate-90 ml-auto" />
                                  </summary>
                                  <div className={`mt-2 pl-3 border-l space-y-1 font-mono text-[11px] ${
                                    isDark ? 'border-emerald-500/30 text-slate-400' : 'border-emerald-500 text-slate-600'
                                  }`}>
                                    {m.thoughts.map((t, i) => (
                                      <div key={i} className="flex items-center space-x-1.5">
                                        <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                                        <span>{t}</span>
                                      </div>
                                    ))}
                                  </div>
                                </details>
                              )}

                              {m.role === 'assistant' ? (
                                <MarkdownViewer content={m.text} isDark={isDark} />
                              ) : (
                                <div>{m.text}</div>
                              )}

                              {/* Referenced Files Pill List */}
                              {m.files && m.files.length > 0 && (
                                <div className={`mt-3 pt-2.5 border-t flex flex-wrap items-center gap-1.5 ${
                                  isDark ? 'border-white/10' : 'border-slate-200'
                                }`}>
                                  <span className="text-[10px] text-slate-500 font-mono">Files:</span>
                                  {m.files.map((f, i) => (
                                    <button
                                      key={i}
                                      onClick={() => {
                                        setActiveTab('explorer');
                                        const findNode = (nodes: any[]): any => {
                                          for (const n of nodes) {
                                            if (n.path === f) return n;
                                            if (n.children) {
                                              const res = findNode(n.children);
                                              if (res) return res;
                                            }
                                          }
                                          return null;
                                        };
                                        const target = findNode(analysis?.fileTree || []);
                                        if (target) setSelectedFileNode(target);
                                      }}
                                      className={`text-[10px] font-mono px-2 py-0.5 rounded-md transition ${
                                        isDark
                                          ? 'bg-white/5 hover:bg-emerald-500/20 text-slate-300 hover:text-emerald-300'
                                          : 'bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700'
                                      }`}
                                    >
                                      {f}
                                    </button>
                                  ))}
                                </div>
                              )}

                              {/* Engine Footer */}
                              {m.role === 'assistant' && (
                                <div className="mt-2 text-[10px] font-mono text-slate-500 flex items-center space-x-1.5">
                                  <span>{m.engine || (geminiActive ? 'Gemini 3.5 Flash' : 'Gitly AI Reasoning Engine')}</span>
                                </div>
                              )}
                            </div>
                          </div>
                        ))
                      )}

                      {/* Assistant Typing / Thinking Bubble */}
                      {chatLoading && (
                        <div className="flex items-start gap-4 justify-start">
                          <div className="w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-sm">
                            <Bot className="w-4 h-4" />
                          </div>
                          <div className={`p-4 rounded-2xl flex items-center space-x-3 text-xs font-mono ${
                            isDark ? 'bg-[#2a2a2a] text-slate-300' : 'bg-slate-100 text-slate-700'
                          }`}>
                            <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
                            <span>Gitly AI is reasoning through the codebase...</span>
                          </div>
                        </div>
                      )}

                      <div ref={chatEndRef} className="h-6" />
                    </div>
                  </div>

                  {/* Floating ChatGPT Bottom Prompt Bar */}
                  <div className={`p-4 border-t ${
                    isDark ? 'border-white/10 bg-[#212121]' : 'border-slate-200 bg-[#ffffff]'
                  }`}>
                    <form
                      onSubmit={handleSendChat}
                      className={`max-w-3xl mx-auto rounded-3xl border p-2 flex items-center gap-2 shadow-lg transition-all ${
                        isDark
                          ? 'bg-[#2f2f2f] border-white/10 focus-within:border-white/20'
                          : 'bg-[#f4f4f4] border-slate-300 focus-within:border-slate-400'
                      }`}
                    >
                      <input
                        type="text"
                        value={chatQuestion}
                        onChange={e => setChatQuestion(e.target.value)}
                        placeholder={`Message Gitly AI about ${analysis.repositoryName}...`}
                        className={`flex-1 bg-transparent px-3 py-1.5 text-xs md:text-sm focus:outline-none ${
                          isDark ? 'text-[#ececec] placeholder-[#8e8ea0]' : 'text-[#0d0d0d] placeholder-[#8e8ea0]'
                        }`}
                      />

                      <button
                        type="submit"
                        disabled={chatLoading || !chatQuestion.trim()}
                        className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-transform active:scale-95 ${
                          chatQuestion.trim() && !chatLoading
                            ? isDark
                              ? 'bg-white text-black hover:bg-slate-200'
                              : 'bg-black text-white hover:bg-slate-800'
                            : isDark
                            ? 'bg-[#3e3f4b] text-slate-500 cursor-not-allowed'
                            : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                        }`}
                        title="Send Message"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                    </form>

                    <div className="text-center mt-2">
                      <span className={`text-[11px] ${isDark ? 'text-slate-500' : 'text-slate-400'}`}>
                        Gitly AI can make mistakes. Verify important code and architectural insights.
                      </span>
                    </div>
                  </div>
                </main>
              </div>
            )}

            {/* ------------------------------------------------------------------- */}
            {/* TAB 2: ARCHITECTURE TOPOLOGY TAB                                    */}
            {/* ------------------------------------------------------------------- */}
            {activeTab === 'architecture' && (
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6 max-w-5xl mx-auto">
                  <MermaidChart
                    chart={analysis.architecture?.mermaidChart || analysis.architecture?.mermaidDiagram || ''}
                    title={`${analysis.repositoryName} â€” Architecture Topology`}
                    isDark={isDark}
                  />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className={`p-5 rounded-2xl border ${isDark ? 'bg-[#2a2a2a] border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                      <h3 className={`text-sm font-semibold mb-2 flex items-center space-x-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        <Share2 className="w-4 h-4 text-emerald-500" />
                        <span>Architecture Overview</span>
                      </h3>
                      <p className={`text-xs leading-relaxed ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                        {stripHtml(analysis.architecture?.explanation || '')}
                      </p>
                    </div>

                    <div className={`p-5 rounded-2xl border ${isDark ? 'bg-[#2a2a2a] border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                      <h3 className={`text-sm font-semibold mb-3 flex items-center space-x-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        <Layers className="w-4 h-4 text-emerald-500" />
                        <span>Architectural Layers ({analysis.architecture?.layers?.length || 0})</span>
                      </h3>
                      <div className="space-y-2">
                        {(analysis.architecture?.layers || []).map((layer: any, idx: number) => (
                          <div key={idx} className={`p-2.5 rounded-xl border text-xs ${
                            isDark ? 'bg-[#212121] border-white/10' : 'bg-slate-50 border-slate-200'
                          }`}>
                            <div className={`font-semibold ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>{layer.name}</div>
                            <div className={`text-[11px] mt-0.5 ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>{layer.responsibility}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------------- */}
            {/* TAB 3: DATA MODELS & PERSISTENCE TAB                                */}
            {/* ------------------------------------------------------------------- */}
            {activeTab === 'database' && (
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6 max-w-5xl mx-auto">
                  <div className={`p-6 rounded-2xl border ${isDark ? 'bg-[#2a2a2a] border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <h3 className={`font-bold text-sm mb-2 flex items-center space-x-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      <Database className="w-4 h-4 text-emerald-500" />
                      <span>Persistence & Data Flow</span>
                    </h3>
                    <div className={`text-xs leading-relaxed mb-4 ${isDark ? 'text-slate-300' : 'text-slate-600'}`}>
                      {analysis.databaseInfo?.dataFlowSummary}
                    </div>

                    {analysis.databaseInfo?.mermaidErDiagram && (
                      <div className="my-4">
                        <MermaidChart
                          chart={analysis.databaseInfo.mermaidErDiagram}
                          title="Entity Models Relationship"
                          isDark={isDark}
                        />
                      </div>
                    )}

                    <div className={`text-xs font-semibold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      Discovered Models & Tables:
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {(analysis.databaseInfo?.detectedModels || []).map((m: string, idx: number) => (
                        <span key={idx} className={`px-3 py-1.5 rounded-xl text-xs font-mono border ${
                          isDark
                            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                            : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}>
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------------- */}
            {/* TAB 4: REPOSITORY FILES EXPLORER TAB                                */}
            {/* ------------------------------------------------------------------- */}
            {activeTab === 'explorer' && (
              <div className="flex-1 p-6 overflow-hidden">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[calc(100vh-140px)] max-w-6xl mx-auto">
                  {/* File Tree Left Pane */}
                  <div className={`md:col-span-5 p-4 rounded-2xl border overflow-y-auto ${
                    isDark ? 'bg-[#2a2a2a] border-white/10' : 'bg-white border-slate-200 shadow-sm'
                  }`}>
                    <div className={`text-xs font-semibold mb-3 uppercase tracking-wider font-mono ${
                      isDark ? 'text-slate-400' : 'text-slate-500'
                    }`}>
                      File Tree ({analysis.totalFiles} files)
                    </div>
                    <div className="space-y-0.5">
                      {(analysis.fileTree || []).map((node: any, idx: number) => (
                        <FileTreeItem
                          key={idx}
                          node={node}
                          onSelect={setSelectedFileNode}
                          selectedPath={selectedFileNode?.path}
                          isDark={isDark}
                        />
                      ))}
                    </div>
                  </div>

                  {/* Code Viewer Right Pane */}
                  <div className={`md:col-span-7 p-5 rounded-2xl border flex flex-col ${
                    isDark ? 'bg-[#2a2a2a] border-white/10' : 'bg-white border-slate-200 shadow-sm'
                  }`}>
                    {selectedFileNode ? (
                      <>
                        <div className={`flex items-center justify-between pb-3 mb-3 border-b ${
                          isDark ? 'border-white/10' : 'border-slate-200'
                        }`}>
                          <div className="flex items-center space-x-2">
                            <FileCode className="w-4 h-4 text-emerald-500" />
                            <span className={`font-mono text-xs font-semibold ${isDark ? 'text-white' : 'text-slate-900'}`}>
                              {selectedFileNode.path}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono text-slate-400">{selectedFileNode.sizeFormatted}</span>
                        </div>
                        <div className={`flex-1 overflow-auto p-4 rounded-xl font-mono text-xs ${
                          isDark ? 'bg-[#181818] text-slate-200' : 'bg-slate-900 text-slate-100'
                        }`}>
                          {selectedFileNode.content ? (
                            <pre className="whitespace-pre">{selectedFileNode.content}</pre>
                          ) : (
                            <div className="text-slate-500 italic">Select a file to inspect its source.</div>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="flex-1 flex items-center justify-center text-xs text-slate-500 font-mono">
                        Select a file from the tree to inspect its source code.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ------------------------------------------------------------------- */}
            {/* TAB 5: OVERVIEW TAB                                                 */}
            {/* ------------------------------------------------------------------- */}
            {activeTab === 'overview' && (
              <div className="flex-1 overflow-y-auto p-6">
                <div className="space-y-6 max-w-5xl mx-auto">
                  <div className={`p-6 rounded-2xl border ${isDark ? 'bg-[#2a2a2a] border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-xs font-mono text-emerald-500 font-semibold">{analysis.overview?.applicationType}</span>
                      <a
                        href={analysis.repositoryUrl}
                        target="_blank"
                        rel="noreferrer"
                        className={`text-xs font-mono flex items-center space-x-1 ${
                          isDark ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-900'
                        }`}
                      >
                        <span>GitHub</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>
                    <h2 className={`text-xl font-bold mb-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                      {analysis.repositoryName}
                    </h2>
                    <div className="text-xs leading-relaxed mb-4">
                      <MarkdownViewer content={analysis.overview?.purpose || ''} isDark={isDark} />
                    </div>
                    {analysis.overview?.businessFunctionality && (
                      <div className={`p-4 rounded-xl border text-xs leading-relaxed ${
                        isDark ? 'bg-[#212121] border-white/10 text-slate-300' : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}>
                        {stripHtml(analysis.overview.businessFunctionality)}
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className={`p-5 rounded-2xl border ${isDark ? 'bg-[#2a2a2a] border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                      <div className={`text-xs font-semibold mb-3 flex items-center space-x-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        <Code className="w-4 h-4 text-emerald-500" />
                        <span>Languages</span>
                      </div>
                      <div className="space-y-2">
                        {Object.entries(analysis.languageDistribution || {}).map(([lang, count]: any) => (
                          <div key={lang} className="flex items-center justify-between text-xs font-mono">
                            <span className={isDark ? 'text-slate-300' : 'text-slate-700'}>{lang}</span>
                            <span className="text-slate-400">{count} files</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className={`p-5 rounded-2xl border ${isDark ? 'bg-[#2a2a2a] border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                      <div className={`text-xs font-semibold mb-3 flex items-center space-x-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        <Cpu className="w-4 h-4 text-emerald-500" />
                        <span>Frameworks</span>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {(analysis.detectedFrameworks || []).map((f: string) => (
                          <span key={f} className={`px-2.5 py-1 rounded-lg text-xs font-mono border ${
                            isDark
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          }`}>
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className={`p-5 rounded-2xl border ${isDark ? 'bg-[#2a2a2a] border-white/10' : 'bg-white border-slate-200 shadow-sm'}`}>
                      <div className={`text-xs font-semibold mb-3 flex items-center space-x-2 ${isDark ? 'text-white' : 'text-slate-900'}`}>
                        <Database className="w-4 h-4 text-emerald-500" />
                        <span>Database & Models</span>
                      </div>
                      <div className={`text-xs font-mono ${isDark ? 'text-slate-300' : 'text-slate-700'}`}>
                        {analysis.databaseInfo?.databaseTechnology || 'Standard Persistence'}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-2">
                        {analysis.databaseInfo?.detectedModels?.length || 0} models detected
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
