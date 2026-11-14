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
  CheckCircle2,
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
  ArrowRight,
  Layers,
  Code
} from 'lucide-react';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace'
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
 * Guarantees zero raw '*', '`', or '>' characters remain in the rendered output.
 */
function renderInlineText(raw: string, isDark: boolean): React.ReactNode[] {
  if (!raw) return [];

  // Pre-clean: strip HTML tags and arrows
  let text = raw
    .replace(/<!--[\s\S]*?-->/g, '')
    .replace(/<\/?[a-zA-Z][a-zA-Z0-9]*(?:\s+[^>]*)?\/?>/g, ' ')
    .replace(/\s*-->\s*/g, ' → ')
    .replace(/\s*->\s*/g, ' → ');

  // Tokenize by code: `code`
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
              ? 'bg-slate-800 text-sky-300 border-slate-700'
              : 'bg-slate-100 text-slate-800 border-slate-300'
          }`}
        >
          {codeVal}
        </code>
      );
      continue;
    }

    // Process bold (**bold**) and italic (*italic*) inside non-code text
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

      // Check italic (*italic* or _italic_)
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

        // Plain text: strip any stray markdown markers like solitary * or >
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
 * Clean, Anti-Slop Markdown & Code Block Renderer.
 * Eliminates all raw *, #, >, `, and HTML tags and outputs clean technical prose.
 */
function MarkdownViewer({ content, isDark = true }: { content: string; isDark?: boolean }) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!content) return null;

  // Split content by fenced code blocks: ```lang ... ```
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
              className={`rounded-lg overflow-hidden border my-2 font-mono text-xs ${
                isDark ? 'border-slate-800 bg-[#0d1117]' : 'border-slate-300 bg-slate-50'
              }`}
            >
              <div
                className={`px-3 py-1.5 border-b flex items-center justify-between text-[11px] ${
                  isDark ? 'border-slate-800 bg-slate-900/90 text-slate-400' : 'border-slate-200 bg-slate-100 text-slate-600'
                }`}
              >
                <div className="flex items-center space-x-2">
                  <Terminal className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-semibold uppercase tracking-wider">{language}</span>
                </div>
                <button
                  onClick={() => handleCopy(codeString, blockIdx)}
                  className={`px-2 py-0.5 rounded text-[10px] flex items-center space-x-1 border transition ${
                    isDark
                      ? 'border-slate-700 hover:bg-slate-800 text-slate-300'
                      : 'border-slate-300 hover:bg-slate-200 text-slate-700'
                  }`}
                >
                  {copiedIndex === blockIdx ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
              <pre className={`p-3 overflow-x-auto leading-relaxed ${isDark ? 'text-slate-200' : 'text-slate-800'}`}>
                {codeString}
              </pre>
            </div>
          );
        }

        // Standard prose and list lines
        const lines = block.split(/\r?\n/);
        return (
          <div key={blockIdx} className="space-y-2">
            {lines.map((rawLine, lIdx) => {
              const trimmed = rawLine.trim();
              if (!trimmed) return null;

              // Headings: #, ##, ###, ####
              const headMatch = trimmed.match(/^(#{1,4})\s+(.+)$/);
              if (headMatch) {
                const level = headMatch[1].length;
                const titleText = headMatch[2].replace(/[#*`]/g, '').trim();
                return (
                  <div key={lIdx} className="pt-2 pb-1">
                    <div
                      className={`font-semibold tracking-tight ${
                        level <= 2
                          ? 'text-sm text-sky-400 border-b border-slate-800 pb-1'
                          : level === 3
                          ? 'text-xs uppercase tracking-wider font-bold text-slate-300'
                          : 'text-xs font-semibold text-slate-400'
                      }`}
                    >
                      {titleText}
                    </div>
                  </div>
                );
              }

              // Blockquote: > quote
              if (trimmed.startsWith('>')) {
                const quoteText = trimmed.replace(/^>+\s*/, '');
                return (
                  <div
                    key={lIdx}
                    className={`pl-3 py-1 my-1 border-l-2 text-xs italic ${
                      isDark ? 'border-sky-500 bg-sky-500/5 text-slate-300' : 'border-sky-600 bg-sky-50 text-slate-700'
                    }`}
                  >
                    {renderInlineText(quoteText, isDark)}
                  </div>
                );
              }

              // Unordered List: - or * or •
              const bulletMatch = trimmed.match(/^([-*•])\s+(.+)$/);
              if (bulletMatch) {
                return (
                  <div key={lIdx} className="flex items-start space-x-2 pl-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 mt-1.5 shrink-0" />
                    <div className="text-xs leading-relaxed flex-1">
                      {renderInlineText(bulletMatch[2], isDark)}
                    </div>
                  </div>
                );
              }

              // Numbered List: 1. or 2.
              const numMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
              if (numMatch) {
                return (
                  <div key={lIdx} className="flex items-start space-x-2 pl-1">
                    <span
                      className={`w-4 h-4 rounded text-[10px] font-mono font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                        isDark ? 'bg-slate-800 text-sky-300' : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {numMatch[1]}
                    </span>
                    <div className="text-xs leading-relaxed flex-1">
                      {renderInlineText(numMatch[2], isDark)}
                    </div>
                  </div>
                );
              }

              // Standard Paragraph
              return (
                <p key={lIdx} className="text-xs leading-relaxed">
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
 * Live Visual Mermaid SVG Canvas
 */
function MermaidCanvas({ chart, title }: { chart: string; title?: string }) {
  const [svgContent, setSvgContent] = useState<string>('');
  const [zoom, setZoom] = useState<number>(1);
  const [showRaw, setShowRaw] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  useEffect(() => {
    if (!chart) return;
    let isMounted = true;
    setSvgContent('');
    const renderDiagram = async () => {
      try {
        const uniqueId = 'mermaid-svg-' + Math.random().toString(36).substring(2, 9);
        const { svg } = await mermaid.render(uniqueId, chart);
        if (isMounted) {
          setSvgContent(svg);
        }
      } catch (err) {
        console.warn('Mermaid rendering notice:', err);
      }
    };
    renderDiagram();
    return () => {
      isMounted = false;
    };
  }, [chart]);

  const handleCopy = () => {
    navigator.clipboard.writeText(chart);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-lg border border-slate-800 bg-[#0b0f17] overflow-hidden">
      <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span className="text-xs font-semibold text-slate-200 font-mono">
            {title || 'Architecture Topology'}
          </span>
        </div>

        <div className="flex items-center space-x-1">
          <button
            onClick={() => setZoom(z => Math.max(0.5, z - 0.15))}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 text-xs transition"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono text-slate-400 px-1.5">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(z => Math.min(2.2, z + 0.15))}
            className="p-1.5 rounded hover:bg-slate-800 text-slate-300 text-xs transition"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="px-2 py-0.5 rounded hover:bg-slate-800 text-slate-400 text-[10px] font-mono transition"
          >
            Reset
          </button>
          <div className="h-3 w-px bg-slate-800 mx-1" />
          <button
            onClick={() => setShowRaw(!showRaw)}
            className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-300 hover:bg-slate-800 transition"
          >
            {showRaw ? 'Diagram' : 'Source'}
          </button>
          <button
            onClick={handleCopy}
            className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-300 hover:bg-slate-800 flex items-center space-x-1 transition"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>
        </div>
      </div>

      {showRaw ? (
        <pre className="p-4 text-xs font-mono text-emerald-400 overflow-x-auto bg-[#080c14]">
          {chart}
        </pre>
      ) : (
        <div className="p-6 overflow-auto flex items-center justify-center min-h-[360px] bg-[#070b12]">
          {svgContent ? (
            <div
              style={{ transform: `scale(${zoom})`, transformOrigin: 'center center', transition: 'transform 0.15s ease' }}
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          ) : (
            <div className="flex items-center space-x-2 text-xs text-slate-500 font-mono">
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              <span>Generating diagram...</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Interactive Folder & File Tree Component
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
        className={`flex items-center space-x-2 px-2 py-1 rounded cursor-pointer text-xs transition ${
          isSelected
            ? 'bg-sky-600 text-white font-medium'
            : isDark
            ? 'hover:bg-slate-800 text-slate-300'
            : 'hover:bg-slate-200 text-slate-700'
        }`}
      >
        {isDir ? (
          open ? <ChevronDown className="w-3.5 h-3.5 shrink-0 text-slate-400" /> : <ChevronRight className="w-3.5 h-3.5 shrink-0 text-slate-500" />
        ) : (
          <span className="w-3.5" />
        )}
        {isDir ? (
          <Folder className="w-3.5 h-3.5 shrink-0 text-amber-400" />
        ) : (
          <FileCode className="w-3.5 h-3.5 shrink-0 text-slate-400" />
        )}
        <span className="truncate font-mono">{node.name}</span>
      </div>
      {isDir && open && node.children && (
        <div className="pl-3.5 border-l border-slate-800 ml-3 mt-0.5 space-y-0.5">
          {node.children.map((child: any, idx: number) => (
            <FileTreeItem key={idx} node={child} onSelect={onSelect} selectedPath={selectedPath} isDark={isDark} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function App() {
  const [isDark, setIsDark] = useState(true);
  const [repoUrl, setRepoUrl] = useState('https://github.com/pranay898/ai_automated_question_bulider-');
  const [branch, setBranch] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<any>(null);

  const [showKeyInput, setShowKeyInput] = useState(false);
  const [apiKeyInput, setApiKeyInput] = useState('');
  const [geminiActive, setGeminiActive] = useState(false);

  const [activeTab, setActiveTab] = useState<
    'architecture' | 'chat' | 'overview' | 'explorer' | 'workflows' | 'components' | 'apis' | 'database' | 'dependencies' | 'onboarding'
  >('architecture');

  const [selectedFileNode, setSelectedFileNode] = useState<any>(null);
  const [compSearch, setCompSearch] = useState('');

  // ChatGPT-style Agent Chat State
  const [chatQuestion, setChatQuestion] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const [chatMessages, setChatMessages] = useState<
    { role: 'user' | 'assistant'; text: string; thoughts?: string[]; files?: string[] }[]
  >([
    {
      role: 'assistant',
      text: 'Ask questions about files, architecture, database models, or workflows in the analyzed repository.'
    }
  ]);

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
      const sampleComps = (data.components || []).slice(0, 5).map((c: any) => '`' + c.filePath + '`').join(', ');
      setChatMessages([
        {
          role: 'assistant',
          thoughts: data.agentThinkingSteps || [],
          text: `### Repository Analysis: ${data.repositoryName}\n\n- **Files:** ${data.totalFiles} files in ${data.totalDirectories} directories\n- **Languages:** ${Object.keys(data.languageDistribution || {}).join(', ')}\n- **Frameworks:** ${(data.detectedFrameworks || []).join(', ') || 'Standard'}\n- **Data Layer:** ${data.databaseInfo?.databaseTechnology || 'Application State'}\n- **Key Modules:** ${sampleComps}\n\nAsk any question about this codebase below.`
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

    setChatMessages(prev => [...prev, { role: 'user', text: questionText }]);
    setChatQuestion('');
    setChatLoading(true);

    try {
      const res = await fetch(`${API_BASE}/api/v1/repositories/${analysis.repositoryId}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: questionText })
      });
      const data = await res.json();
      if (res.ok) {
        setChatMessages(prev => [
          ...prev,
          {
            role: 'assistant',
            text: data.answer,
            thoughts: data.agentThoughts,
            files: data.referencedFiles
          }
        ]);
      } else {
        setChatMessages(prev => [
          ...prev,
          { role: 'assistant', text: 'Error: ' + (data.message || 'Failed to get answer') }
        ]);
      }
    } catch (err: any) {
      setChatMessages(prev => [...prev, { role: 'assistant', text: 'Network connection failed.' }]);
    } finally {
      setChatLoading(false);
    }
  };

  const handleSendChat = (e: React.FormEvent) => {
    e.preventDefault();
    askQuestion(chatQuestion);
  };

  const firstCompName = analysis?.components?.[0]?.name || 'main entry';
  const secondCompName = analysis?.components?.[1]?.name || 'core service';
  const suggestedPrompts = [
    `Explain the architecture and purpose of this project`,
    `How does ${firstCompName} work and what does it call?`,
    `How does ${secondCompName} handle its logic?`,
    `What database or persistence layer is configured?`,
    `How to run and test this repository locally?`
  ];

  const navTabs = [
    { id: 'architecture', label: 'Architecture', icon: Share2, count: null },
    { id: 'chat', label: 'Codebase Chat', icon: MessageSquare, count: null },
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
    <div className={`min-h-screen flex flex-col font-sans ${isDark ? 'bg-[#090d16] text-slate-200' : 'bg-white text-slate-800'}`}>
      {/* Top Application Bar */}
      <header className={`border-b px-4 py-2.5 flex items-center justify-between gap-4 sticky top-0 z-30 ${isDark ? 'bg-[#0d1117] border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
        <div className="flex items-center space-x-3 shrink-0">
          <div className="flex items-center space-x-2">
            <div className="w-7 h-7 rounded-md bg-slate-800 border border-slate-700 flex items-center justify-center text-sky-400">
              <Code className="w-4 h-4" />
            </div>
            <div>
              <span className="font-semibold text-xs tracking-tight text-white">RepoMind</span>
              <span className="ml-2 text-[10px] font-mono text-slate-400 border border-slate-700 px-1.5 py-0.5 rounded">v1.0</span>
            </div>
          </div>
        </div>

        {/* Input Form */}
        <form onSubmit={handleAnalyze} className="flex-1 max-w-2xl flex items-center space-x-2">
          <div className="relative flex-1">
            <FolderGit2 className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              value={repoUrl}
              onChange={e => setRepoUrl(e.target.value)}
              placeholder="github.com/owner/repository"
              className={`w-full rounded-md pl-9 pr-3 py-1.5 text-xs font-mono border focus:outline-none focus:ring-1 focus:ring-sky-500 ${
                isDark ? 'bg-[#090d16] border-slate-700 text-slate-200 placeholder-slate-500' : 'bg-white border-slate-300 text-slate-800'
              }`}
            />
          </div>
          <input
            type="text"
            value={branch}
            onChange={e => setBranch(e.target.value)}
            placeholder="branch"
            className={`w-24 rounded-md px-2.5 py-1.5 text-xs font-mono border focus:outline-none focus:ring-1 focus:ring-sky-500 ${
              isDark ? 'bg-[#090d16] border-slate-700 text-slate-200 placeholder-slate-500' : 'bg-white border-slate-300 text-slate-800'
            }`}
          />
          <button
            type="submit"
            disabled={loading}
            className="bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white text-xs font-medium px-3.5 py-1.5 rounded-md transition flex items-center space-x-1.5 shrink-0"
          >
            {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : null}
            <span>{loading ? 'Analyzing' : 'Analyze'}</span>
          </button>
        </form>

        <div className="flex items-center space-x-2 shrink-0">
          <button
            onClick={() => setShowKeyInput(!showKeyInput)}
            className={`px-2.5 py-1 rounded text-xs font-mono border transition flex items-center space-x-1.5 ${
              geminiActive
                ? 'border-emerald-600/40 bg-emerald-500/10 text-emerald-400'
                : isDark
                ? 'border-slate-700 hover:bg-slate-800 text-slate-300'
                : 'border-slate-300 hover:bg-slate-100 text-slate-700'
            }`}
            title="Configure Gemini API Key"
          >
            <KeyRound className="w-3 h-3" />
            <span>{geminiActive ? 'API Key Active' : 'API Key'}</span>
          </button>

          <button
            onClick={() => setIsDark(!isDark)}
            className={`p-1.5 rounded border transition ${isDark ? 'border-slate-700 hover:bg-slate-800 text-slate-400' : 'border-slate-300 hover:bg-slate-100 text-slate-600'}`}
            title="Toggle Theme"
          >
            {isDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
          </button>
        </div>
      </header>

      {/* API Key Drawer */}
      {showKeyInput && (
        <form onSubmit={handleSaveApiKey} className={`px-4 py-2 border-b flex items-center justify-between gap-3 text-xs ${isDark ? 'bg-slate-900 border-slate-800' : 'bg-slate-100 border-slate-200'}`}>
          <div className="text-slate-400 flex items-center space-x-2">
            <KeyRound className="w-3.5 h-3.5 text-slate-400" />
            <span>Optional: Paste Google Gemini API Key for online reasoning (saved in session):</span>
          </div>
          <div className="flex items-center space-x-2 flex-1 max-w-sm">
            <input
              type="password"
              value={apiKeyInput}
              onChange={e => setApiKeyInput(e.target.value)}
              placeholder="AIzaSy..."
              className={`flex-1 rounded px-2.5 py-1 text-xs font-mono border ${isDark ? 'bg-[#090d16] border-slate-700 text-white' : 'bg-white border-slate-300'}`}
            />
            <button type="submit" className="px-3 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white text-xs font-medium">
              Save
            </button>
          </div>
        </form>
      )}

      {/* Error Banner */}
      {error && (
        <div className="px-4 py-2 bg-rose-500/10 border-b border-rose-500/20 text-rose-400 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Empty State */}
      {!analysis ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="max-w-xl space-y-6">
            <div className="w-12 h-12 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center mx-auto text-sky-400">
              <FolderGit2 className="w-6 h-6" />
            </div>

            <div className="space-y-2">
              <h2 className="text-xl font-semibold tracking-tight text-white">
                Understand any repository visually
              </h2>
              <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
                Paste a public GitHub repository link to inspect architecture topologies, dependency flows, file relationships, and ask natural language questions.
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
              <span className="text-xs text-slate-500">Sample repositories:</span>
              {[
                'https://github.com/pranay898/ai_automated_question_bulider-',
                'https://github.com/ayushiee/nextflix',
                'https://github.com/spring-projects/spring-petclinic'
              ].map(url => (
                <button
                  key={url}
                  onClick={() => setRepoUrl(url)}
                  className={`text-xs font-mono px-2.5 py-1 rounded border transition ${
                    isDark ? 'bg-[#0d1117] border-slate-800 hover:border-slate-600 text-slate-300' : 'bg-slate-100 border-slate-300 hover:border-slate-400 text-slate-700'
                  }`}
                >
                  {url.replace('https://github.com/', '')}
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Repository Meta Banner & Tabs */}
          <div className={`border-b px-4 py-2 flex flex-wrap items-center justify-between gap-3 ${isDark ? 'bg-[#0d1117] border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center space-x-3 text-xs font-mono">
              <a
                href={analysis.repositoryUrl}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-white hover:text-sky-400 flex items-center space-x-1"
              >
                <span>{analysis.repositoryName}</span>
                <ExternalLink className="w-3 h-3 text-slate-500" />
              </a>
              <span className="text-slate-600">/</span>
              <span className="text-slate-400">{analysis.branch || 'main'}</span>
              <span className="text-slate-600">•</span>
              <span className="text-slate-400">{analysis.totalFiles} files</span>
              <span className="text-slate-600">•</span>
              <span className="text-emerald-400 font-sans text-[11px] flex items-center space-x-1">
                <CheckCircle2 className="w-3 h-3" />
                <span>Indexed</span>
              </span>
            </div>

            {/* Segmented Tab Navigation */}
            <div className="flex items-center space-x-1 overflow-x-auto">
              {navTabs.map(tab => {
                const active = activeTab === tab.id;
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`px-2.5 py-1 rounded text-xs font-medium flex items-center space-x-1.5 transition ${
                      active
                        ? 'bg-slate-800 text-white font-semibold'
                        : isDark
                        ? 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0" />
                    <span>{tab.label}</span>
                    {tab.count !== null && (
                      <span className="text-[10px] font-mono text-slate-500 ml-0.5">
                        {tab.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Tab Views */}
          <main className="flex-1 overflow-y-auto p-4 max-w-7xl mx-auto w-full">
            {/* 1. ARCHITECTURE TAB */}
            {activeTab === 'architecture' && (
              <div className="space-y-4">
                <MermaidCanvas
                  chart={analysis.architecture?.mermaidDiagram}
                  title={`System Topology: ${analysis.repositoryName}`}
                />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {(analysis.architecture?.layers || []).map((layer: any, idx: number) => (
                    <div
                      key={idx}
                      className={`p-3.5 rounded-lg border ${
                        isDark ? 'bg-[#0d1117] border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center space-x-2 mb-1.5">
                        <span className="w-5 h-5 rounded bg-slate-800 text-sky-400 font-mono text-xs flex items-center justify-center font-bold">
                          {idx + 1}
                        </span>
                        <h3 className="font-semibold text-xs text-slate-200">{layer.name}</h3>
                      </div>
                      <p className="text-xs text-slate-400 mb-2 leading-relaxed">
                        {stripHtml(layer.responsibility)}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {(layer.relatedFiles || []).map((f: string) => (
                          <span
                            key={f}
                            className={`text-[11px] font-mono px-2 py-0.5 rounded border ${
                              isDark ? 'bg-slate-900 border-slate-800 text-slate-300' : 'bg-white border-slate-200 text-slate-700'
                            }`}
                          >
                            {f}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 2. CHAT TAB */}
            {activeTab === 'chat' && (
              <div className="flex flex-col h-[calc(100vh-160px)] max-w-3xl mx-auto">
                <div className="flex-1 overflow-y-auto space-y-4 pr-1 pb-4">
                  {chatMessages.map((m, idx) => (
                    <div key={idx} className={`flex items-start space-x-2.5 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {m.role === 'assistant' && (
                        <div className="w-7 h-7 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-sky-400 shrink-0 mt-0.5">
                          <Bot className="w-4 h-4" />
                        </div>
                      )}

                      <div
                        className={`rounded-lg p-3 text-xs leading-relaxed max-w-2xl border ${
                          m.role === 'user'
                            ? 'bg-sky-600 border-sky-500 text-white rounded-br-none'
                            : isDark
                            ? 'bg-[#0d1117] border-slate-800 text-slate-200 rounded-bl-none'
                            : 'bg-slate-50 border-slate-200 text-slate-800 rounded-bl-none'
                        }`}
                      >
                        {m.thoughts && m.thoughts.length > 0 && (
                          <details className="mb-2.5 rounded bg-slate-900/80 border border-slate-800 px-2.5 py-1.5 text-slate-400">
                            <summary className="text-[11px] font-mono font-medium text-slate-300 cursor-pointer">
                              Analysis process ({m.thoughts.length} steps)
                            </summary>
                            <div className="mt-1.5 space-y-1 text-[11px] font-mono pl-2 border-l border-slate-700 text-slate-400">
                              {m.thoughts.map((t, ti) => (
                                <div key={ti}>• {stripHtml(t)}</div>
                              ))}
                            </div>
                          </details>
                        )}

                        {m.role === 'assistant' ? (
                          <MarkdownViewer content={m.text} isDark={isDark} />
                        ) : (
                          <div className="text-xs font-medium">{m.text}</div>
                        )}

                        {m.files && m.files.length > 0 && (
                          <div className="mt-2.5 pt-2 border-t border-slate-800 flex flex-wrap items-center gap-1">
                            <span className="text-[10px] text-slate-400">Referenced:</span>
                            {m.files.map((f, i) => (
                              <span key={i} className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-300">
                                {f}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>

                      {m.role === 'user' && (
                        <div className="w-7 h-7 rounded bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 shrink-0 mt-0.5">
                          <UserIcon className="w-4 h-4" />
                        </div>
                      )}
                    </div>
                  ))}

                  {chatLoading && (
                    <div className="flex items-center space-x-2 text-xs text-slate-400 font-mono py-2">
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Searching repository index...</span>
                    </div>
                  )}
                  <div ref={chatEndRef} />
                </div>

                {/* Prompt suggestions */}
                <div className="flex flex-wrap gap-1.5 py-2">
                  {suggestedPrompts.map(p => (
                    <button
                      key={p}
                      onClick={() => askQuestion(p)}
                      disabled={chatLoading}
                      className={`text-[11px] px-2.5 py-1 rounded border transition ${
                        isDark
                          ? 'border-slate-800 bg-[#0d1117] hover:border-slate-700 text-slate-400 hover:text-slate-200'
                          : 'border-slate-200 bg-slate-100 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>

                <form onSubmit={handleSendChat} className="mt-1 flex items-center space-x-2">
                  <input
                    type="text"
                    value={chatQuestion}
                    onChange={e => setChatQuestion(e.target.value)}
                    placeholder={`Ask about ${analysis.repositoryName}...`}
                    className={`flex-1 rounded-md px-3 py-2 text-xs border focus:outline-none focus:ring-1 focus:ring-sky-500 ${
                      isDark ? 'bg-[#0d1117] border-slate-800 text-slate-200 placeholder-slate-500' : 'bg-white border-slate-300 text-slate-800'
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={chatLoading || !chatQuestion.trim()}
                    className="bg-sky-600 hover:bg-sky-500 disabled:opacity-40 text-white text-xs font-medium px-4 py-2 rounded-md transition flex items-center space-x-1"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send</span>
                  </button>
                </form>
              </div>
            )}

            {/* 3. OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-4 max-w-4xl mx-auto">
                <div className={`p-4 rounded-lg border ${isDark ? 'bg-[#0d1117] border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-mono text-sky-400 font-semibold">{analysis.overview?.applicationType}</span>
                    <a
                      href={analysis.repositoryUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-xs font-mono text-slate-400 hover:text-white flex items-center space-x-1"
                    >
                      <span>GitHub</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <h2 className="text-base font-semibold text-white mb-2">{analysis.repositoryName}</h2>
                  <div className="text-xs text-slate-300 leading-relaxed mb-3">
                    <MarkdownViewer content={analysis.overview?.purpose || ''} isDark={isDark} />
                  </div>
                  {analysis.overview?.businessFunctionality && (
                    <div className="p-3 rounded bg-slate-900 border border-slate-800 text-xs text-slate-400 leading-relaxed">
                      {stripHtml(analysis.overview.businessFunctionality)}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className={`p-3.5 rounded-lg border ${isDark ? 'bg-[#0d1117] border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="text-xs font-semibold text-slate-300 mb-2">Languages</div>
                    <div className="space-y-1.5">
                      {Object.entries(analysis.languageDistribution || {}).map(([lang, count]: any) => (
                        <div key={lang} className="flex items-center justify-between text-xs font-mono">
                          <span className="text-slate-300">{lang}</span>
                          <span className="text-slate-400">{count} files</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className={`p-3.5 rounded-lg border ${isDark ? 'bg-[#0d1117] border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="text-xs font-semibold text-slate-300 mb-2">Frameworks</div>
                    <div className="flex flex-wrap gap-1">
                      {(analysis.detectedFrameworks || []).length > 0 ? (
                        analysis.detectedFrameworks.map((fw: string) => (
                          <span key={fw} className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-emerald-400 border border-slate-700">
                            {fw}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500">Standard language runtime</span>
                      )}
                    </div>
                  </div>

                  <div className={`p-3.5 rounded-lg border ${isDark ? 'bg-[#0d1117] border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <div className="text-xs font-semibold text-slate-300 mb-2">Modules</div>
                    <div className="flex flex-wrap gap-1">
                      {(analysis.overview?.mainModules || []).map((m: string) => (
                        <span key={m} className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 4. EXPLORER TAB */}
            {activeTab === 'explorer' && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 h-[calc(100vh-160px)]">
                <div className={`md:col-span-5 rounded-lg border p-3 overflow-y-auto ${isDark ? 'bg-[#0d1117] border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2 font-mono">
                    Tree ({analysis.totalFiles} files)
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

                <div className={`md:col-span-7 rounded-lg border p-4 overflow-y-auto ${isDark ? 'bg-[#0d1117] border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  {selectedFileNode ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                        <div>
                          <div className="text-[10px] font-mono text-slate-500 uppercase">{selectedFileNode.type}</div>
                          <div className="text-sm font-semibold font-mono text-white mt-0.5">{selectedFileNode.name}</div>
                          <div className="text-xs font-mono text-slate-400">{selectedFileNode.path}</div>
                        </div>
                        {selectedFileNode.language && (
                          <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                            {selectedFileNode.language}
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-300 leading-relaxed">
                        {stripHtml(selectedFileNode.roleSummary)}
                      </div>

                      {selectedFileNode.type === 'FILE' && (
                        <button
                          onClick={() => {
                            setActiveTab('chat');
                            askQuestion(`Explain the functions and logic in ${selectedFileNode.path}`);
                          }}
                          className="text-xs px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-mono transition"
                        >
                          Ask about this file
                        </button>
                      )}
                    </div>
                  ) : (
                    <div className="text-xs text-slate-500 font-mono">Select a file from the tree to view its role.</div>
                  )}
                </div>
              </div>
            )}

            {/* 5. WORKFLOWS TAB */}
            {activeTab === 'workflows' && (
              <div className="space-y-4 max-w-4xl mx-auto">
                {(analysis.workflows || []).map((wf: any, idx: number) => (
                  <div key={idx} className={`p-4 rounded-lg border space-y-3 ${isDark ? 'bg-[#0d1117] border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                    <div>
                      <h3 className="text-sm font-semibold text-white">{stripHtml(wf.title)}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{stripHtml(wf.description)}</p>
                    </div>
                    <MermaidCanvas chart={wf.mermaidCode} title={stripHtml(wf.title)} />
                    {wf.steps && wf.steps.length > 0 && (
                      <div className="space-y-1.5 pt-1">
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider font-mono">Steps</div>
                        {wf.steps.map((s: string, si: number) => (
                          <div key={si} className="text-xs text-slate-300 flex items-center space-x-2 font-mono">
                            <ArrowRight className="w-3 h-3 text-sky-400 shrink-0" />
                            <span>{stripHtml(s)}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* 6. COMPONENTS TAB */}
            {activeTab === 'components' && (
              <div className="space-y-3 max-w-5xl mx-auto">
                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-400 font-mono">
                    Showing {filteredComponents.length} components
                  </div>
                  <div className="relative w-64">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={compSearch}
                      onChange={e => setCompSearch(e.target.value)}
                      placeholder="Filter components..."
                      className={`w-full rounded pl-8 pr-2.5 py-1 text-xs border focus:outline-none focus:ring-1 focus:ring-sky-500 ${
                        isDark ? 'bg-[#0d1117] border-slate-800 text-slate-200' : 'bg-white border-slate-300'
                      }`}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {filteredComponents.map((c: any, idx: number) => (
                    <div
                      key={idx}
                      className={`p-3 rounded-lg border flex flex-col justify-between space-y-2 ${
                        isDark ? 'bg-[#0d1117] border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-mono font-semibold text-xs text-sky-400">{c.name}</span>
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
                            {c.category}
                          </span>
                        </div>
                        <div className="text-[11px] font-mono text-slate-500 mb-1.5 truncate">{c.filePath}</div>
                        <div className="text-xs text-slate-300 leading-relaxed">
                          {stripHtml(c.responsibility)}
                        </div>
                      </div>

                      {c.relatedComponents && c.relatedComponents.length > 0 && (
                        <div className="pt-2 border-t border-slate-800 flex flex-wrap gap-1">
                          <span className="text-[10px] text-slate-500 font-mono">imports:</span>
                          {c.relatedComponents.map((imp: string, ii: number) => (
                            <span key={ii} className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-slate-400">
                              {imp}
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
              <div className="space-y-2 max-w-4xl mx-auto">
                <div className="text-xs text-slate-400 font-mono mb-2">
                  Total Endpoints & Handlers: {(analysis.apis || []).length}
                </div>
                {(analysis.apis || []).map((api: any, idx: number) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded border flex items-center justify-between gap-3 text-xs ${
                      isDark ? 'bg-[#0d1117] border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center space-x-2 font-mono">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-emerald-400 border border-slate-700">
                        {api.method}
                      </span>
                      <span className="font-semibold text-white">{api.path}</span>
                    </div>
                    <div className="text-slate-400 font-mono text-[11px] truncate max-w-xs">{api.filePath}</div>
                  </div>
                ))}
              </div>
            )}

            {/* 8. DATABASE TAB */}
            {activeTab === 'database' && (
              <div className="space-y-4 max-w-4xl mx-auto">
                {analysis.databaseInfo?.mermaidErDiagram && (
                  <MermaidCanvas
                    chart={analysis.databaseInfo.mermaidErDiagram}
                    title="Data Store Model"
                  />
                )}
                <div className={`p-4 rounded-lg border space-y-3 ${isDark ? 'bg-[#0d1117] border-slate-800' : 'bg-slate-50 border-slate-200'}`}>
                  <div className="text-xs font-mono">
                    <span className="text-slate-500">Database Engine: </span>
                    <span className="font-semibold text-emerald-400">{analysis.databaseInfo?.databaseTechnology}</span>
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">
                    {stripHtml(analysis.databaseInfo?.dataFlowSummary || '')}
                  </p>

                  {analysis.databaseInfo?.detectedModels?.length > 0 && (
                    <div>
                      <div className="text-xs font-mono uppercase tracking-wider text-slate-400 mb-1.5">
                        Collections / Entities
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {analysis.databaseInfo.detectedModels.map((m: string) => (
                          <span key={m} className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-sky-300 border border-slate-700">
                            {m}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 9. DEPENDENCIES TAB */}
            {activeTab === 'dependencies' && (
              <div className="space-y-2 max-w-4xl mx-auto">
                <div className="text-xs text-slate-400 font-mono mb-2">
                  Total Dependencies: {(analysis.dependencies || []).length}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {(analysis.dependencies || []).map((d: any, idx: number) => (
                    <div
                      key={idx}
                      className={`p-2.5 rounded border text-xs ${
                        isDark ? 'bg-[#0d1117] border-slate-800' : 'bg-slate-50 border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between font-mono">
                        <span className="font-semibold text-white">{d.name}</span>
                        <span className="text-[10px] text-slate-500">{d.version}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 truncate">{d.purpose}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 10. ONBOARDING GUIDE TAB */}
            {activeTab === 'onboarding' && (
              <div className="space-y-3 max-w-4xl mx-auto">
                <div className="text-xs text-slate-400 font-mono mb-2">
                  5-Day Project Onboarding Sequence
                </div>
                {(analysis.onboardingGuide || []).map((day: any) => (
                  <div
                    key={day.day}
                    className={`p-4 rounded-lg border space-y-2 ${
                      isDark ? 'bg-[#0d1117] border-slate-800' : 'bg-slate-50 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-semibold font-mono text-white">
                        Day {day.day}: {stripHtml(day.title)}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      {stripHtml(day.focusArea)}
                    </p>

                    {day.filesToRead && day.filesToRead.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1 pt-1">
                        <span className="text-[10px] font-mono text-slate-500">Read:</span>
                        {day.filesToRead.map((f: string) => (
                          <span key={f} className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-sky-300 border border-slate-700">
                            {f}
                          </span>
                        ))}
                      </div>
                    )}

                    {day.practicalExercise && (
                      <div className="text-xs p-2.5 rounded bg-slate-900 border border-slate-800 text-emerald-400 font-mono">
                        Exercise: {stripHtml(day.practicalExercise)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </main>
        </div>
      )}
    </div>
  );
}
