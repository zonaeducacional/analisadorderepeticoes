import { useState, useRef } from 'react'
import { FileText, Trash2, CheckCircle, AlertTriangle, UploadCloud, File, Play, PowerOff } from 'lucide-react'

function App() {
  const [appState, setAppState] = useState('upload') // 'upload', 'loading', 'review'
  const [groups, setGroups] = useState([])
  const [activeGroupId, setActiveGroupId] = useState(null)
  
  const [selectedFiles, setSelectedFiles] = useState([])
  const fileInputRef = useRef(null)

  const handleFileSelect = (e) => {
    setSelectedFiles(Array.from(e.target.files))
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDrop = (e) => {
    e.preventDefault()
    if (e.dataTransfer.files) {
      setSelectedFiles(Array.from(e.dataTransfer.files))
    }
  }

  const handleAnalyze = async () => {
    if (selectedFiles.length === 0) return
    
    setAppState('loading')
    const formData = new FormData()
    selectedFiles.forEach(file => {
      formData.append('files', file)
    })

    try {
      const response = await fetch('http://localhost:5000/api/analyze', {
        method: 'POST',
        body: formData,
      })
      
      const data = await response.json()
      if (response.ok) {
        setGroups(data)
        if (data.length > 0) setActiveGroupId(data[0].id)
        setAppState('review')
      } else {
        alert("Erro na análise: " + data.error)
        setAppState('upload')
      }
    } catch (err) {
      console.error(err)
      alert("Erro ao conectar com o servidor.")
      setAppState('upload')
    }
  }

  const handleDelete = (groupId, itemIndex) => {
    fetch(`http://localhost:5000/api/delete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ group_id: groupId, item_index: itemIndex })
    })
    .then(res => res.json())
    .then(data => {
      if(data.success) {
        setGroups(groups.map(g => {
          if (g.id === groupId) {
            const newItems = [...g.items]
            newItems[itemIndex] = { ...newItems[itemIndex], deleted: true }
            return { ...g, items: newItems }
          }
          return g
        }))
      }
    })
  }

  const activeGroup = groups.find(g => g.id === activeGroupId)

  // Abstract Background Decoration Component
  const Background = () => (
    <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
      <div className="absolute -top-[20%] -right-[10%] w-[50%] h-[50%] rounded-full bg-blue-500/10 blur-[120px]"></div>
      <div className="absolute bottom-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[120px]"></div>
    </div>
  )

  if (appState === 'loading') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white relative">
        <Background />
        <div className="z-10 flex flex-col items-center gap-6 p-8 bg-slate-800/50 backdrop-blur-md rounded-3xl border border-slate-700/50 shadow-2xl">
          <div className="animate-spin w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full"></div>
          <h2 className="text-2xl font-light">Analisando textos...</h2>
          <p className="text-slate-400">Processando {selectedFiles.length} arquivos, isso pode levar alguns segundos.</p>
        </div>
      </div>
    )
  }

  if (appState === 'upload') {
    return (
      <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white relative">
        <Background />
        
        <div className="z-10 max-w-2xl w-full px-6">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent mb-4">
              Analisador de Repetições
            </h1>
            <p className="text-slate-400 text-lg">
              Envie seus arquivos (.docx ou .txt) para encontrar frases e parágrafos que se repetem entre eles.
            </p>
          </div>

          <div 
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="bg-slate-800/40 backdrop-blur-sm border-2 border-dashed border-slate-600 rounded-3xl p-12 flex flex-col items-center justify-center transition-all hover:border-blue-500/50 hover:bg-slate-800/60"
          >
            <UploadCloud size={64} className="text-blue-400 mb-6" />
            <h3 className="text-xl font-medium mb-2">Arraste e solte seus arquivos aqui</h3>
            <p className="text-slate-500 mb-6">ou</p>
            
            <input 
              type="file" 
              multiple 
              accept=".txt,.docx"
              className="hidden" 
              ref={fileInputRef}
              onChange={handleFileSelect}
            />
            <button 
              onClick={() => fileInputRef.current.click()}
              className="px-6 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl transition-colors font-medium"
            >
              Procurar Arquivos
            </button>
          </div>

          {selectedFiles.length > 0 && (
            <div className="mt-8 p-6 bg-slate-800/50 backdrop-blur-md rounded-2xl border border-slate-700/50">
              <div className="flex items-center justify-between mb-4">
                <h4 className="font-semibold text-slate-200">Arquivos Selecionados ({selectedFiles.length})</h4>
                <button 
                  onClick={() => setSelectedFiles([])}
                  className="text-sm text-red-400 hover:text-red-300"
                >
                  Limpar
                </button>
              </div>
              <div className="grid grid-cols-2 gap-3 max-h-40 overflow-y-auto mb-6 pr-2">
                {selectedFiles.map((f, i) => (
                  <div key={i} className="flex items-center gap-3 p-2 bg-slate-900/50 rounded-lg text-sm text-slate-300">
                    <File size={16} className="text-blue-400 shrink-0" />
                    <span className="truncate">{f.name}</span>
                  </div>
                ))}
              </div>
              <button 
                onClick={handleAnalyze}
                className="w-full flex items-center justify-center gap-2 px-6 py-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white rounded-xl font-bold shadow-lg transition-all hover:scale-[1.02]"
              >
                <Play size={20} />
                Iniciar Análise
              </button>
            </div>
          )}
        </div>
      </div>
    )
  }

const handleShutdown = () => {
    fetch('http://localhost:5000/api/shutdown', { method: 'POST' }).catch(()=>console.log("Desligado"))
    alert("O servidor foi desligado. Você pode fechar esta aba.")
  }

  // REVIEW MODE
  return (
    <div className="flex h-screen bg-slate-900 text-slate-100 font-sans overflow-hidden">
      {/* Sidebar */}
      <div className="w-1/3 max-w-sm bg-slate-800/50 backdrop-blur-md border-r border-slate-700/50 flex flex-col z-10 relative">
        <div className="p-6 border-b border-slate-700/50 flex justify-between items-start">
          <div>
            <button 
              onClick={() => { setAppState('upload'); setSelectedFiles([]); setGroups([]); }}
              className="text-sm text-blue-400 hover:text-blue-300 mb-4 flex items-center gap-1"
            >
              ← Nova Análise
            </button>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
              Revisão
            </h1>
            <p className="text-slate-400 text-sm mt-2">{groups.length} grupos em {selectedFiles.length} arquivos</p>
          </div>
          <button 
            onClick={handleShutdown}
            className="flex items-center justify-center p-2 rounded-full bg-red-500/10 text-red-400 hover:bg-red-500 hover:text-white transition-all shadow-md"
            title="Desligar Servidor"
          >
            <PowerOff size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {groups.length === 0 ? (
             <div className="text-slate-500 text-center mt-10">Nenhuma repetição encontrada!</div>
          ) : (
            groups.map(group => (
              <button
                key={group.id}
                onClick={() => setActiveGroupId(group.id)}
                className={`w-full text-left p-4 rounded-xl transition-all duration-200 border ${activeGroupId === group.id ? 'bg-blue-600/20 border-blue-500/50 shadow-lg shadow-blue-500/10' : 'bg-slate-800/30 border-transparent hover:bg-slate-700/50 hover:border-slate-600'}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-slate-200">Grupo {group.id}</span>
                  <span className="text-xs px-2 py-1 bg-slate-700/50 rounded-full text-slate-300">{group.items.length} itens</span>
                </div>
                <p className="text-sm text-slate-400 line-clamp-2">{group.items[0]?.text}</p>
              </button>
            ))
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col relative overflow-hidden bg-gradient-to-br from-slate-900 to-slate-800">
        <Background />

        {activeGroup ? (
          <div className="p-8 flex-1 overflow-y-auto z-10">
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="flex items-center gap-3 mb-8">
                <AlertTriangle className="text-yellow-500" />
                <h2 className="text-3xl font-light">
                  Análise do <strong className="font-bold text-white">Grupo {activeGroup.id}</strong>
                </h2>
              </div>
              
              {activeGroup.items.map((item, idx) => (
                <div key={idx} className={`p-6 rounded-2xl border transition-all duration-300 ${item.deleted ? 'bg-slate-800/20 border-slate-700/30 opacity-50' : 'bg-slate-800/60 border-slate-600/50 backdrop-blur-sm shadow-xl'}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-3 text-sm text-blue-300 font-medium">
                        <FileText size={16} />
                        {item.file}
                      </div>
                      <p className={`text-lg leading-relaxed ${item.deleted ? 'line-through text-slate-500' : 'text-slate-200'}`}>
                        {item.text}
                      </p>
                    </div>
                    
                    {!item.deleted ? (
                      <div className="flex flex-col gap-2 shrink-0">
                        <button 
                          onClick={() => handleDelete(activeGroup.id, idx)}
                          className="flex items-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg transition-colors border border-red-500/20"
                        >
                          <Trash2 size={18} />
                          <span className="font-medium text-sm">Apagar</span>
                        </button>
                        <button className="flex items-center gap-2 px-4 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg transition-colors border border-emerald-500/20">
                          <CheckCircle size={18} />
                          <span className="font-medium text-sm">Manter</span>
                        </button>
                      </div>
                    ) : (
                      <div className="px-3 py-1 bg-slate-700/50 rounded text-slate-400 text-sm flex items-center gap-2">
                        <Trash2 size={14} /> Removido
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500 z-10">
            {groups.length > 0 ? "Selecione um grupo na lateral para iniciar a revisão." : ""}
          </div>
        )}
      </div>
    </div>
  )
}

export default App
