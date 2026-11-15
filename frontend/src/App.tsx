import React, { useState, useEffect, useRef } from 'react';
import mermaid from 'mermaid';
import {
  FolderGit2,
  Share2,
  FolderTree,
  GitBranch,
  Cpu,
  Globe,
  Database,
  Package,
  GraduationCap,
  MessageSquare,
  Search,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  FileCode,
  Folder,
  AlertCircle,
  Sun,
  Moon,
  Send,
  ExternalLink,
  ZoomIn,
  ZoomOut,
  Copy,
  Check,
  Bot,
  User as UserIcon,
  KeyRound,
  Terminal,
  Layers,
  Code,
  Sparkles,
  RotateCcw,
  Zap
} from 'lucide-react';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
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

  let text = raw
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/?[a-zA-Z][a-zA-Z0-9]*(?:\s+[^>]*)?\/?>/g, ' ')
    .replace(/\s*-->\s*/g, ' → ')
    .replace(/\s*->\s*/g, ' → ');

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
              ? 'bg-[#151C2C] text-emerald-300 border-emerald-500/20'
              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
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
          const language = hasLang ? firstLine : 'code';
          const codeString = hasLang ? lines.slice(1).join('\n') : lines.join('\n');

          return (
            <div
              key={blockIdx}
              className={`rounded-xl overflow-hidden border my-3 font-mono text-xs shadow-lg ${
                isDark ? 'border-white/[0.08] bg-[#080B11]' : 'border-slate-200 bg-slate-900 text-slate-100'
              }`}
            >
              <div
                className={`px-3.5 py-2 border-b flex items-center justify-between text-[11px] ${
                  isDark ? 'border-white/[0.06] bg-[#0E131E] text-slate-400' : 'border-slate-800 bg-slate-800 text-slate-400'
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
                      ? 'border-white/[0.08] hover:bg-white/[0.06] text-slate-300'
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
                      <span>Copy</span>
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
                          ? 'text-base text-white border-b border-white/[0.08] pb-1'
                          : level === 2
                          ? 'text-sm text-emerald-400'
                          : 'text-xs uppercase tracking-wider font-bold text-slate-300'
                      }`}
                    >
                      {titleText}
                    </div>
                  </div>
                );
              }

              // Blockquote
              if (trimmed.startsWith('>')) {
                const quoteText = trimmed.replace(/^>+\s*/, '');
                return (
                  <div
                    key={lIdx}
                    className={`pl-3 py-1.5 my-1.5 border-l-2 text-xs italic rounded-r ${
                      isDark ? 'border-emerald-500 bg-emerald-500/5 text-slate-300' : 'border-emerald-600 bg-emerald-50 text-slate-700'
                    }`}
                  >
                    {renderInlineText(quoteText, isDark)}
                  </div>
                );
              }

              // Unordered List
              const bulletMatch = trimmed.match(/^([-*•])\s+(.+)$/);
              if (bulletMatch) {
                return (
                  <div key={lIdx} className="flex items-start space-x-2 pl-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                    <div className="text-xs leading-relaxed flex-1 text-slate-300">
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
                        isDark ? 'bg-[#151C2C] text-emerald-400 border border-emerald-500/20' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {numMatch[1]}
                    </span>
                    <div className="text-xs leading-relaxed flex-1 text-slate-300">
                      {renderInlineText(numMatch[2], isDark)}
                    </div>
                  </div>
                );
              }

              // Standard Paragraph
              return (
                <p key={lIdx} className="text-xs leading-relaxed text-slate-300">
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
 * Interactive Mermaid Architecture Diagram Viewer.
 */
function MermaidChart({ chart, title }: { chart: string; title?: string }) {
  const [svgContent, setSvgContent] = useState<string>('');
  const [zoom, setZoom] = useState<number>(1);
  const [copied, setCopied] = useState<boolean>(false);
  const [showRaw, setShowRaw] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;
    const renderDiagram = async () => {
      if (!chart || !chart.trim()) return;
      try {
        const id = 'mermaid-svg-' + Math.random().toString(36).substring(2, 9);
        const { svg } = await mermaid.render(id, chart);
        if (isMounted) setSvgContent(svg);
      } catch (err) {
        console.error('Mermaid render error:', err);
      }
    };
    renderDiagram();
    return () => { isMounted = false; };
  }, [chart]);

  const handleCopy = () => {
    navigator.clipboard.writeText(chart);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-white/[0.08] overflow-hidden bg-[#0A0D14] shadow-2xl">
      <div className="px-4 py-3 border-b border-white/[0.08] bg-[#0E131E] flex items-center justify-between">
        <div className="flex items-center space-x-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-semibold text-slate-200 font-mono tracking-tight">
            {title || 'Repository Architecture Topology'}
          </span>
        </div>

        <div className="flex items-center space-x-1.5">
          <button
            onClick={() => setZoom(z => Math.max(0.4, z - 0.15))}
            className="p-1.5 rounded-lg hover:bg-white/[0.08] text-slate-300 transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-mono text-slate-400 px-1">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(z => Math.min(2.5, z + 0.15))}
            className="p-1.5 rounded-lg hover:bg-white/[0.08] text-slate-300 transition"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="px-2.5 py-1 rounded-lg hover:bg-white/[0.08] text-slate-400 text-[11px] font-mono transition"
          >
            Reset
          </button>
          <div className="h-4 w-px bg-white/[0.08] mx-1" />
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="px-2.5 py-1 rounded-lg text-[11px] font-mono text-slate-300 hover:bg-white/[0.08] transition"
          >
            {showRaw ? 'Visual Diagram' : 'Mermaid Source'}
          </button>
          <button
            onClick={handleCopy}
            className="px-2.5 py-1 rounded-lg text-[11px] font-mono text-slate-300 hover:bg-white/[0.08] flex items-center space-x-1.5 transition"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {showRaw ? (
        <pre className="p-4 text-xs font-mono text-emerald-400 overflow-x-auto bg-[#07090E]">
          {chart}
        </pre>
      ) : (
        <div className="p-8 overflow-auto flex items-center justify-center min-h-[420px] bg-[#07090E] bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:16px_16px]">
          {svgContent ? (
            <div
              style={{ transform: `scale(${zoom})`, transformOrigin: 'center center', transition: 'transform 0.15s ease' }}
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          ) : (
            <div className="flex items-center space-x-2 text-xs text-slate-500 font-mono">
              <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
              <span>Generating architecture diagram...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/**
 * Interactive File Tree Component
 */
function FileTreeItem({ node, onSelect, selectedPath, isDark }: { node: any; onSelect: (n: any) => void; selectedPath?: string; isDark: boolean }) {
  const [open, setOpen] = useState(false);
  const isDir = node.type === 'DIRECTORY';
  const isSelected = selectedPath === node.path;

  return (
    <div>
      <div
        onClick={() => {
          if (isDir) setOpen(!open);
          onSelect(node);
        }}
        className={`flex items-center space-x-2 px-2.5 py-1.5 rounded-lg text-xs font-mono cursor-pointer transition select-none ${
          isSelected
            ? 'bg-emerald-500/15 text-emerald-400 font-medium'
            : isDark
            ? 'hover:bg-white/[0.04] text-slate-300'
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
        <div className="pl-4 ml-2 border-l border-white/[0.08] space-y-0.5 mt-0.5">
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

  const [activeTab, setActiveTab] = useState<
    'architecture' | 'chat' | 'overview' | 'explorer' | 'workflows' | 'components' | 'apis' | 'database' | 'dependencies' | 'onboarding'
  >('architecture');

  const [selectedFileNode, setSelectedFileNode] = useState<any | null>(null);
  const [compSearch, setCompSearch] = useState('');

  // ChatGPT State
  const [chatMessages, setChatMessages] = useState<
    Array<{ role: 'user' | 'assistant'; text: string; thoughts?: string[]; files?: string[]; engine?: string }>
  >([]);
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Check health and Gemini active status on load
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

  const handleAnalyze = async (e: React.FormEvent) => {
    e.preventDefault();
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
      setCompSearch('');
      if (data.fileTree && data.fileTree.length > 0) {
        setSelectedFileNode(data.fileTree[0]);
      }
      setActiveTab('architecture');
      // Initialize first welcome message
      setChatMessages([
        {
          role: 'assistant',
          thoughts: data.agentThinkingSteps || [
            `Scanned ${data.totalFiles} files across ${data.totalDirectories} directories`,
            `Identified primary language: ${Object.keys(data.languageDistribution || {})[0] || 'Unknown'}`,
            `Mapped architecture and components into visual topology`
          ],
          text: `Hello! I have analyzed **${data.repositoryName}**.\n\n`
            + `- **Language Stack:** ${Object.keys(data.languageDistribution || {}).join(', ') || 'Multi-language'}\n`
            + `- **Frameworks:** ${(data.detectedFrameworks || []).join(', ') || 'Standard'}\n`
            + `- **Data Layer:** ${data.databaseInfo?.databaseTechnology || 'Application State'}\n\n`
            + `You can ask me any question like in ChatGPT: file locations, execution flow, function logic, bugs, or how to run it locally.`
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
      // Build conversation history to send to backend for multi-turn ChatGPT memory
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

  const suggestedPrompts = [
    `Explain the project architecture and data flow`,
    `Walk me through the main entrypoint file`,
    `What database, tables, or collections are configured?`,
    `How do I set up and run this codebase locally?`,
    `What are the critical dependencies and external APIs?`
  ];

  const navTabs = [
    { id: 'architecture', label: 'Architecture', icon: Share2, count: null },
    { id: 'chat', label: 'Codebase ChatGPT', icon: MessageSquare, count: null },
    { id: 'overview', label: 'Overview', icon: Layers, count: null },
    { id: 'explorer', label: 'Files', icon: FolderTree, count: analysis?.totalFiles || null },
    { id: 'workflows', label: 'Workflows', icon: GitBranch, count: analysis?.workflows?.length || null },
    { id: 'components', label: 'Components', icon: Cpu, count: analysis?.components?.length || null },
    { id: 'apis', label: 'APIs & Routes', icon: Globe, count: analysis?.apis?.length || null },
    { id: 'database', label: 'Data Models', icon: Database, count: analysis?.databaseInfo?.detectedModels?.length || null },
    { id: 'dependencies', label: 'Dependencies', icon: Package, count: analysis?.dependencies?.length || null },
    { id: 'onboarding', label: 'Onboarding Guide', icon: GraduationCap, count: null }
  ] as const;

  const filteredComponents = (analysis?.components || []).filter(
    (c: any) =>
      c.name.toLowerCase().includes(compSearch.toLowerCase()) ||
      c.category.toLowerCase().includes(compSearch.toLowerCase()) ||
      c.filePath.toLowerCase().includes(compSearch.toLowerCase()) ||
      c.responsibility.toLowerCase().includes(compSearch.toLowerCase())
  );

  return (
    <div className={`min-h-screen flex flex-col font-sans ${isDark ? 'bg-[#07090E] text-slate-200' : 'bg-slate-50 text-slate-900'}`}>
      {/* Top Application Bar */}
      <header className={`border-b px-5 py-3 flex items-center justify-between gap-4 sticky top-0 z-30 backdrop-blur-xl ${
        isDark ? 'bg-[#0A0D14]/90 border-white/[0.08]' : 'bg-white/90 border-slate-200 shadow-sm'
      }`}>
        {/* Brand Logo */}
        <div className="flex items-center space-x-3 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <Zap className="w-4 h-4 fill-white text-white" />
          </div>
          <div>
            <div className="flex items-center space-x-2">
              <span className="font-bold text-sm tracking-tight text-white">RepoMind</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-semibold">AI 2.0</span>
            </div>
            <p className="text-[10px] text-slate-400 tracking-wide font-medium">Visual Codebase Intelligence</p>
          </div>
        </div>

        {/* Repository Search & Action Bar */}
        <form onSubmit={handleAnalyze} className="flex-1 max-w-2xl flex items-center space-x-2">
          <div className="relative flex-1">
            <FolderGit2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              value={repoUrl}
              onChange={e => setRepoUrl(e.target.value)}
              placeholder="Paste public GitHub repository URL (e.g. https://github.com/owner/repo)"
              className={`w-full rounded-xl pl-9 pr-3 py-2 text-xs font-mono border focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition ${
                isDark ? 'bg-[#0E131E] border-white/[0.08] text-slate-100 placeholder-slate-500' : 'bg-white border-slate-300 text-slate-800'
              }`}
            />
          </div>
          <input
            type="text"
            value={branch}
            onChange={e => setBranch(e.target.value)}
            placeholder="branch (opt)"
            className={`w-28 rounded-xl px-3 py-2 text-xs font-mono border focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition ${
              isDark ? 'bg-[#0E131E] border-white/[0.08] text-slate-100 placeholder-slate-500' : 'bg-white border-slate-300 text-slate-800'
            }`}
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 disabled:opacity-50 text-white text-xs font-semibold px-4 py-2 rounded-xl transition shadow-lg shadow-emerald-500/20 flex items-center space-x-2 shrink-0 active:scale-95"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>{loading ? 'Analyzing...' : 'Analyze'}</span>
          </button>
        </form>

        {/* Global Controls */}
        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => setShowKeyInput(!showKeyInput)}
            className={`px-3 py-1.5 rounded-xl text-xs font-mono border transition flex items-center space-x-2 ${
              geminiActive
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                : isDark
                ? 'border-white/[0.08] hover:bg-white/[0.04] text-slate-400 hover:text-slate-200'
                : 'border-slate-300 hover:bg-slate-100 text-slate-700'
            }`}
            title="Configure Gemini API Key"
          >
            <KeyRound className="w-3.5 h-3.5" />
            <span>{geminiActive ? 'Gemini AI Active' : 'Set Gemini Key'}</span>
            <span className={`w-1.5 h-1.5 rounded-full ${geminiActive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
          </button>

          <button
            onClick={() => setIsDark(!isDark)}
            className={`p-2 rounded-xl border transition ${
              isDark ? 'border-white/[0.08] hover:bg-white/[0.04] text-slate-400' : 'border-slate-300 hover:bg-slate-100 text-slate-600'
            }`}
            title="Toggle Theme"
          >
            {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* Gemini API Key Modal / Drawer */}
      {showKeyInput && (
        <form onSubmit={handleSaveApiKey} className={`px-5 py-2.5 border-b flex items-center justify-between gap-4 text-xs animate-in slide-in-from-top ${
          isDark ? 'bg-[#0E131E] border-white/[0.08]' : 'bg-slate-100 border-slate-200'
        }`}>
          <div className="flex items-center space-x-2.5 text-slate-300">
            <KeyRound className="w-4 h-4 text-emerald-400" />
            <span><strong>Google Gemini API Key:</strong> Enter your key for online multi-turn reasoning:</span>
          </div>
          <div className="flex items-center space-x-2 flex-1 max-w-md">
            <input
              type="password"
              value={apiKeyInput}
              onChange={e => setApiKeyInput(e.target.value)}
              placeholder="AIzaSy..."
              className={`flex-1 rounded-xl px-3 py-1.5 text-xs font-mono border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                isDark ? 'bg-[#07090E] border-white/[0.12] text-white' : 'bg-white border-slate-300'
              }`}
            />
            <button type="submit" className="px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition">
              Connect Key
            </button>
          </div>
        </form>
      )}

      {/* Error Notification */}
      {error && (
        <div className="px-5 py-3 bg-rose-500/10 border-b border-rose-500/20 text-rose-300 text-xs flex items-center space-x-2.5">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Hero Welcome Screen (When no repository is analyzed yet) */}
      {!analysis ? (
        <main className="flex-1 flex flex-col items-center justify-center p-6 text-center max-w-4xl mx-auto my-auto space-y-8">
          <div className="space-y-4">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/10 text-emerald-400 text-xs font-mono">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Next-Gen Visual Repository Intelligence</span>
            </div>

            <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white leading-tight">
              Understand Any GitHub Repository <br />
              <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-cyan-400 bg-clip-text text-transparent">
                Visually & Interactively
              </span>
            </h1>

            <p className="text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
              Generate architecture topology diagrams, inspect multi-language AST components, trace workflows, and chat with an intelligent codebase ChatGPT.
            </p>
          </div>

          {/* Feature Showcase Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full pt-4 text-left">
            <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#0E131E]/60 backdrop-blur-md space-y-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                <Share2 className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-sm text-white">Visual Architecture</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Automatic GitDiagram topology mapping layers, services, controllers, and data models.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#0E131E]/60 backdrop-blur-md space-y-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <MessageSquare className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-sm text-white">Codebase ChatGPT</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Multi-turn conversation powered by Gemini AI with live source code grounded references.
              </p>
            </div>

            <div className="p-5 rounded-2xl border border-white/[0.08] bg-[#0E131E]/60 backdrop-blur-md space-y-2">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
                <GraduationCap className="w-4 h-4" />
              </div>
              <h3 className="font-semibold text-sm text-white">5-Day Onboarding</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tailored ramp-up guides for newly joined developers without senior dependency.
              </p>
            </div>
          </div>
        </main>
      ) : (
        /* Repository Dashboard Screen */
        <div className="flex-1 flex flex-col">
          {/* Repository Meta Banner */}
          <div className={`px-5 py-2.5 border-b flex items-center justify-between text-xs font-mono ${
            isDark ? 'bg-[#0A0D14] border-white/[0.08]' : 'bg-slate-100 border-slate-200'
          }`}>
            <div className="flex items-center space-x-3">
              <span className="font-bold text-white text-sm">{analysis.repositoryName}</span>
              <span className="px-2 py-0.5 rounded bg-white/[0.06] text-slate-300 text-[11px] border border-white/[0.06]">
                {analysis.branch || 'default'}
              </span>
              <span className="text-slate-400">•</span>
              <span className="text-slate-400">{analysis.totalFiles} files</span>
              <span className="text-slate-400">•</span>
              <span className="text-emerald-400 font-semibold">{analysis.overview?.applicationType || 'Application'}</span>
            </div>

            <a
              href={analysis.repositoryUrl}
              target="_blank"
              rel="noreferrer"
              className="text-slate-400 hover:text-white flex items-center space-x-1.5 transition"
            >
              <span>View on GitHub</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>

          {/* Segmented Navigation Tabs */}
          <div className={`px-5 border-b flex items-center space-x-1 overflow-x-auto ${
            isDark ? 'bg-[#0E131E] border-white/[0.08]' : 'bg-white border-slate-200'
          }`}>
            {navTabs.map(tab => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`flex items-center space-x-2 py-3 px-3.5 text-xs font-medium border-b-2 transition whitespace-nowrap ${
                    isActive
                      ? 'border-emerald-400 text-emerald-400 font-semibold'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>{tab.label}</span>
                  {tab.count !== null && (
                    <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isActive ? 'bg-emerald-500/20 text-emerald-300' : 'bg-white/[0.06] text-slate-400'
                    }`}>
                      {tab.count}
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          {/* Active Tab Content Area */}
          <div className="flex-1 p-5 overflow-auto">
            {/* 1. ARCHITECTURE TOPOLOGY TAB */}
            {activeTab === 'architecture' && (
              <div className="space-y-6 max-w-6xl mx-auto">
                <MermaidChart chart={analysis.architecture?.mermaidChart} title={`${analysis.repositoryName} — Architecture Topology`} />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className={`p-5 rounded-2xl border ${isDark ? 'bg-[#0E131E] border-white/[0.08]' : 'bg-white border-slate-200'}`}>
                    <h3 className="text-sm font-semibold text-white mb-2 flex items-center space-x-2">
                      <Share2 className="w-4 h-4 text-emerald-400" />
                      <span>Architecture Overview</span>
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {stripHtml(analysis.architecture?.explanation || '')}
                    </p>
                  </div>

                  <div className={`p-5 rounded-2xl border ${isDark ? 'bg-[#0E131E] border-white/[0.08]' : 'bg-white border-slate-200'}`}>
                    <h3 className="text-sm font-semibold text-white mb-3 flex items-center space-x-2">
                      <Layers className="w-4 h-4 text-cyan-400" />
                      <span>Architectural Layers ({analysis.architecture?.layers?.length || 0})</span>
                    </h3>
                    <div className="space-y-2">
                      {(analysis.architecture?.layers || []).map((layer: any, idx: number) => (
                        <div key={idx} className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.05] text-xs">
                          <div className="font-semibold text-slate-200">{layer.name}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{layer.responsibility}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 2. CHATGPT CODEBASE CHAT TAB */}
            {activeTab === 'chat' && (
              <div className="max-w-4xl mx-auto flex flex-col h-[calc(100vh-210px)]">
                {/* Chat Header Bar */}
                <div className={`px-4 py-2.5 rounded-t-2xl border-t border-x flex items-center justify-between ${
                  isDark ? 'bg-[#0E131E] border-white/[0.08]' : 'bg-slate-100 border-slate-200'
                }`}>
                  <div className="flex items-center space-x-2.5">
                    <div className="w-6 h-6 rounded-lg bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white flex items-center space-x-2">
                        <span>RepoMind Codebase Assistant</span>
                        <span className="flex items-center space-x-1 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.2 rounded-full border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>{geminiActive ? 'Gemini 1.5 Flash (Live)' : 'RepoMind Reasoning Engine'}</span>
                        </span>
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setChatMessages([
                        {
                          role: 'assistant',
                          text: `New conversation started for **${analysis.repositoryName}**. Ask any question about its code, functions, or architecture.`
                        }
                      ]);
                    }}
                    className="p-1.5 rounded-lg hover:bg-white/[0.08] text-slate-400 hover:text-white text-xs flex items-center space-x-1 transition"
                    title="Clear Conversation"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span className="text-[11px]">New Chat</span>
                  </button>
                </div>

                {/* Message Scroll Area */}
                <div className={`flex-1 overflow-y-auto p-5 border-x space-y-5 ${
                  isDark ? 'bg-[#07090E] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
                }`}>
                  {chatMessages.map((m, idx) => (
                    <div
                      key={idx}
                      className={`flex items-start space-x-3.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      {m.role === 'assistant' && (
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center text-white shrink-0 shadow-lg shadow-emerald-500/10">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}

                      <div
                        className={`rounded-2xl p-4 text-xs max-w-2xl leading-relaxed shadow-sm ${
                          m.role === 'user'
                            ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white rounded-tr-none font-medium'
                            : isDark
                            ? 'bg-[#0E131E] border border-white/[0.08] text-slate-200 rounded-tl-none'
                            : 'bg-white border border-slate-200 text-slate-800 rounded-tl-none'
                        }`}
                      >
                        {/* Thinking Process Accordion (ChatGPT style) */}
                        {m.thoughts && m.thoughts.length > 0 && (
                          <details className="mb-3 border-b border-white/[0.06] pb-2 text-[11px] group">
                            <summary className="cursor-pointer text-slate-400 hover:text-emerald-400 font-mono flex items-center space-x-2 select-none">
                              <Sparkles className="w-3 h-3 text-emerald-400" />
                              <span>Thinking Process ({m.thoughts.length} steps)</span>
                              <ChevronRight className="w-3 h-3 transition-transform group-open:rotate-90 ml-auto" />
                            </summary>
                            <div className="mt-2 pl-3 border-l border-emerald-500/30 space-y-1 font-mono text-[11px] text-slate-400">
                              {m.thoughts.map((t, i) => (
                                <div key={i} className="flex items-center space-x-1.5">
                                  <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                                  <span>{t}</span>
                                </div>
                              ))}
                            </div>
                          </details>
                        )}

                        {m.role === 'assistant' ? (
                          <MarkdownViewer content={m.text} isDark={isDark} />
                        ) : (
                          <div className="text-xs">{m.text}</div>
                        )}

                        {/* Referenced File Tags */}
                        {m.files && m.files.length > 0 && (
                          <div className="mt-3 pt-2.5 border-t border-white/[0.06] flex flex-wrap items-center gap-1.5">
                            <span className="text-[10px] text-slate-400 font-mono">Referenced:</span>
                            {m.files.map((f, i) => (
                              <button
                                key={i}
                                onClick={() => {
                                  setActiveTab('explorer');
                                  // Find node in fileTree
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
                                  const targetNode = findNode(analysis?.fileTree || []);
                                  if (targetNode) setSelectedFileNode(targetNode);
                                }}
                                className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-white/[0.05] hover:bg-emerald-500/20 hover:text-emerald-300 text-slate-300 transition"
                              >
                                {f}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>

                      {m.role === 'user' && (
                        <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0">
                          <UserIcon className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  ))}

                  {chatLoading && (
                    <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono py-2 pl-12">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                      <span>RepoMind AI is thinking...</span>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Prompt Suggestions Bar */}
                <div className={`px-4 py-2 border-x flex flex-wrap gap-1.5 ${
                  isDark ? 'bg-[#0A0D14] border-white/[0.08]' : 'bg-slate-100 border-slate-200'
                }`}>
                  {suggestedPrompts.map(p => (
                    <button
                      key={p}
                      onClick={() => askQuestion(p)}
                      disabled={chatLoading}
                      className={`text-[11px] px-3 py-1 rounded-xl border transition ${
                        isDark
                          ? 'border-white/[0.08] bg-[#0E131E] hover:border-emerald-500/40 text-slate-400 hover:text-emerald-300'
                          : 'border-slate-200 bg-white hover:border-slate-300 text-slate-700'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                {/* Bottom Input Area */}
                <form
                  onSubmit={handleSendChat}
                  className={`p-3.5 border rounded-b-2xl flex items-center space-x-2.5 ${
                    isDark ? 'bg-[#0E131E] border-white/[0.08]' : 'bg-white border-slate-200'
                  }`}
                >
                  <input
                    type="text"
                    value={chatQuestion}
                    onChange={e => setChatQuestion(e.target.value)}
                    placeholder={`Ask anything about ${analysis.repositoryName}... (Press Enter)`}
                    className={`flex-1 rounded-xl px-4 py-2.5 text-xs border focus:outline-none focus:ring-2 focus:ring-emerald-500/40 transition ${
                      isDark
                        ? 'bg-[#07090E] border-white/[0.08] text-slate-200 placeholder-slate-500'
                        : 'bg-slate-50 border-slate-200 text-slate-800'
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={chatLoading || !chatQuestion.trim()}
                    className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-semibold px-4 py-2.5 rounded-xl transition flex items-center space-x-1.5 shadow-lg shadow-emerald-500/20 active:scale-95"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </form>
              </div>
            )}

            {/* 3. OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-6 max-w-5xl mx-auto">
                <div className={`p-6 rounded-2xl border ${isDark ? 'bg-[#0E131E] border-white/[0.08]' : 'bg-white border-slate-200 shadow-sm'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-mono text-emerald-400 font-semibold">{analysis.overview?.applicationType}</span>
                    <a
                      href={analysis.repositoryUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-mono text-slate-400 hover:text-white flex items-center space-x-1"
                    >
                      <span>GitHub</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                  <h2 className="text-xl font-bold text-white mb-2">{analysis.repositoryName}</h2>
                  <div className="text-xs text-slate-300 leading-relaxed mb-4">
                    <MarkdownViewer content={analysis.overview?.purpose || ''} isDark={isDark} />
                  </div>
                  {analysis.overview?.businessFunctionality && (
                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] text-xs text-slate-300 leading-relaxed">
                      {stripHtml(analysis.overview.businessFunctionality)}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className={`p-5 rounded-2xl border ${isDark ? 'bg-[#0E131E] border-white/[0.08]' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <div className="text-xs font-semibold text-white mb-3 flex items-center space-x-2">
                      <Code className="w-4 h-4 text-emerald-400" />
                      <span>Languages</span>
                    </div>
                    <div className="space-y-2">
                      {Object.entries(analysis.languageDistribution || {}).map(([lang, count]: any) => (
                        <div key={lang} className="flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-300">{lang}</span>
                          <span className="text-slate-400">{count} files</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={`p-5 rounded-2xl border ${isDark ? 'bg-[#0E131E] border-white/[0.08]' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <div className="text-xs font-semibold text-white mb-3 flex items-center space-x-2">
                      <Cpu className="w-4 h-4 text-cyan-400" />
                      <span>Frameworks</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {(analysis.detectedFrameworks || []).map((f: string) => (
                        <span key={f} className="px-2.5 py-1 rounded-lg text-xs font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className={`p-5 rounded-2xl border ${isDark ? 'bg-[#0E131E] border-white/[0.08]' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <div className="text-xs font-semibold text-white mb-3 flex items-center space-x-2">
                      <Database className="w-4 h-4 text-amber-400" />
                      <span>Database & Models</span>
                    </div>
                    <div className="text-xs text-slate-300 font-mono">
                      {analysis.databaseInfo?.databaseTechnology || 'Standard Persistence'}
                    </div>
                    <div className="text-[11px] text-slate-400 mt-2">
                      {analysis.databaseInfo?.detectedModels?.length || 0} models detected
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. FILES EXPLORER TAB */}
            {activeTab === 'explorer' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-4 h-[calc(100vh-210px)] max-w-6xl mx-auto">
                <div className={`md:col-span-5 p-4 rounded-2xl border overflow-y-auto ${
                  isDark ? 'bg-[#0E131E] border-white/[0.08]' : 'bg-white border-slate-200'
                }`}>
                  <div className="text-xs font-semibold text-slate-400 mb-3 uppercase tracking-wider font-mono">
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

                <div className={`md:col-span-7 p-5 rounded-2xl border flex flex-col ${
                  isDark ? 'bg-[#0E131E] border-white/[0.08]' : 'bg-white border-slate-200'
                }`}>
                  {selectedFileNode ? (
                    <>
                      <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/[0.08]">
                        <div className="flex items-center space-x-2">
                          <FileCode className="w-4 h-4 text-emerald-400" />
                          <span className="font-mono text-xs font-semibold text-white">{selectedFileNode.path}</span>
                        </div>
                        <span className="text-[11px] font-mono text-slate-400">{selectedFileNode.sizeFormatted}</span>
                      </div>
                      <div className="flex-1 overflow-auto bg-[#07090E] p-4 rounded-xl font-mono text-xs text-slate-300">
                        {selectedFileNode.content ? (
                          <pre>{selectedFileNode.content}</pre>
                        ) : (
                          <div className="text-slate-500 italic">Select a file to inspect its content.</div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="flex-1 flex items-center justify-center text-xs text-slate-500 font-mono">
                      Select a file from the tree to view its source code.
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 5. WORKFLOWS TAB */}
            {activeTab === 'workflows' && (
              <div className="space-y-6 max-w-5xl mx-auto">
                {(analysis.workflows || []).map((wf: any, idx: number) => (
                  <div key={idx} className={`p-6 rounded-2xl border ${isDark ? 'bg-[#0E131E] border-white/[0.08]' : 'bg-white border-slate-200 shadow-sm'}`}>
                    <div className="flex items-center space-x-3 mb-2">
                      <div className="w-7 h-7 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-mono text-xs font-bold">
                        {idx + 1}
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-white">{wf.title}</h3>
                        <p className="text-xs text-slate-400">{wf.description}</p>
                      </div>
                    </div>

                    {wf.mermaidChart && (
                      <div className="my-4">
                        <MermaidChart chart={wf.mermaidChart} title={wf.title} />
                      </div>
                    )}

                    <div className="space-y-1.5 mt-3">
                      <div className="text-xs font-semibold text-slate-300 mb-1">Execution Steps:</div>
                      {(wf.steps || []).map((s: string, sIdx: number) => (
                        <div key={sIdx} className="flex items-start space-x-2 text-xs text-slate-300">
                          <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono flex items-center justify-center shrink-0 mt-0.5">
                            {sIdx + 1}
                          </span>
                          <span>{s}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 6. COMPONENTS TAB */}
            {activeTab === 'components' && (
              <div className="space-y-4 max-w-5xl mx-auto">
                <div className="relative">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={compSearch}
                    onChange={e => setCompSearch(e.target.value)}
                    placeholder="Search classes, controllers, services, models..."
                    className={`w-full rounded-xl pl-9 pr-3 py-2 text-xs font-mono border focus:outline-none focus:ring-1 focus:ring-emerald-500 ${
                      isDark ? 'bg-[#0E131E] border-white/[0.08] text-white placeholder-slate-500' : 'bg-white border-slate-300'
                    }`}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredComponents.map((c: any, idx: number) => (
                    <div key={idx} className={`p-4 rounded-xl border ${isDark ? 'bg-[#0E131E] border-white/[0.08]' : 'bg-white border-slate-200'}`}>
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="font-mono text-xs font-bold text-white">{c.name}</span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          {c.category}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-slate-400 mb-2 truncate">{c.filePath}</div>
                      <div className="text-xs text-slate-300 leading-relaxed mb-2">{c.responsibility}</div>
                      {c.relatedComponents && c.relatedComponents.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2 pt-2 border-t border-white/[0.06]">
                          {c.relatedComponents.map((dep: string, dIdx: number) => (
                            <span key={dIdx} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/[0.04] text-slate-400">
                              {dep}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 7. APIS TAB */}
            {activeTab === 'apis' && (
              <div className="space-y-4 max-w-5xl mx-auto">
                <div className="grid grid-cols-1 gap-2.5">
                  {(analysis.apis || []).map((api: any, idx: number) => (
                    <div key={idx} className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-mono ${
                      isDark ? 'bg-[#0E131E] border-white/[0.08]' : 'bg-white border-slate-200'
                    }`}>
                      <div className="flex items-center space-x-3">
                        <span className={`px-2 py-1 rounded text-[11px] font-bold ${
                          api.method === 'GET' ? 'bg-sky-500/15 text-sky-400' :
                          api.method === 'POST' ? 'bg-emerald-500/15 text-emerald-400' :
                          api.method === 'PUT' ? 'bg-amber-500/15 text-amber-400' :
                          'bg-rose-500/15 text-rose-400'
                        }`}>
                          {api.method}
                        </span>
                        <span className="font-semibold text-white">{api.path}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400">{api.description}</span>
                        <span className="text-[10px] text-slate-500 block">{api.filePath}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 8. DATABASE TAB */}
            {activeTab === 'database' && (
              <div className="space-y-6 max-w-5xl mx-auto">
                <div className={`p-6 rounded-2xl border ${isDark ? 'bg-[#0E131E] border-white/[0.08]' : 'bg-white border-slate-200'}`}>
                  <h3 className="font-bold text-sm text-white mb-2">Persistence Architecture</h3>
                  <div className="text-xs text-slate-300 leading-relaxed mb-4">
                    {analysis.databaseInfo?.dataFlowSummary}
                  </div>
                  <div className="text-xs font-semibold text-white mb-2">Discovered Models & Tables:</div>
                  <div className="flex flex-wrap gap-2">
                    {(analysis.databaseInfo?.detectedModels || []).map((m: string, idx: number) => (
                      <span key={idx} className="px-3 py-1.5 rounded-xl text-xs font-mono bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                        {m}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* 9. DEPENDENCIES TAB */}
            {activeTab === 'dependencies' && (
              <div className="space-y-4 max-w-5xl mx-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(analysis.dependencies || []).map((dep: any, idx: number) => (
                    <div key={idx} className={`p-3.5 rounded-xl border flex items-center justify-between text-xs font-mono ${
                      isDark ? 'bg-[#0E131E] border-white/[0.08]' : 'bg-white border-slate-200'
                    }`}>
                      <div>
                        <div className="font-bold text-white">{dep.name}</div>
                        <div className="text-[10px] text-slate-400">{dep.purpose}</div>
                      </div>
                      <span className="px-2 py-0.5 rounded bg-white/[0.06] text-slate-300 text-[11px]">
                        {dep.version || 'detected'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 10. ONBOARDING GUIDE TAB */}
            {activeTab === 'onboarding' && (
              <div className="space-y-6 max-w-5xl mx-auto">
                {(analysis.onboardingGuide || []).map((day: any, idx: number) => (
                  <div key={idx} className={`p-6 rounded-2xl border ${isDark ? 'bg-[#0E131E] border-white/[0.08]' : 'bg-white border-slate-200'}`}>
                    <div className="flex items-center space-x-3 mb-2">
                      <span className="px-2.5 py-1 rounded-lg text-xs font-mono font-bold bg-emerald-500/20 text-emerald-400">
                        Day {day.day}
                      </span>
                      <h3 className="font-bold text-sm text-white">{day.title}</h3>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed mb-3">{day.goal}</p>
                    <div className="space-y-1.5 pl-4 border-l-2 border-emerald-500/30">
                      {(day.tasks || []).map((task: string, tIdx: number) => (
                        <div key={tIdx} className="text-xs text-slate-400 flex items-center space-x-2">
                          <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          <span>{task}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
