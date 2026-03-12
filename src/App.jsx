import { useState, useEffect } from 'react'
import {
  Plus, Printer, Trash2, Pencil, Check, Car,
  ArrowLeft, Calendar, MapPin, ChevronRight, Wrench, Paintbrush
} from 'lucide-react'

// ─── Constants ───────────────────────────────────────────────────────────────

const QUICK_TAGS = [
  { label: 'Runs/Drives',       color: 'bg-green-100 text-green-800 border-green-400' },
  { label: 'As-Is',             color: 'bg-yellow-100 text-yellow-800 border-yellow-400' },
  { label: 'Check Engine Light', color: 'bg-red-100 text-red-800 border-red-400' },
]

const INTEREST_LEVELS = [
  { value: 'hot',   label: 'Hot Buy',   text: 'text-red-700',    border: 'border-red-400',    bg: 'bg-red-50'    },
  { value: 'good',  label: 'Good Deal', text: 'text-green-700',  border: 'border-green-400',  bg: 'bg-green-50'  },
  { value: 'maybe', label: 'Maybe',     text: 'text-yellow-700', border: 'border-yellow-400', bg: 'bg-yellow-50' },
  { value: 'pass',  label: 'Pass',      text: 'text-gray-500',   border: 'border-gray-300',   bg: 'bg-gray-50'   },
]

const emptyCarForm = {
  run: '', lane: '', year: '', make: '', model: '',
  color: '', miles: '', maxBid: '',
  tags: [], mechanical: '', cosmetic: '',
  interest: 'maybe',
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getLevel(value) {
  return INTEREST_LEVELS.find(l => l.value === value) || INTEREST_LEVELS[2]
}

function getTagStyle(label) {
  return QUICK_TAGS.find(t => t.label === label)?.color || 'bg-gray-100 text-gray-700 border-gray-300'
}

function formatDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  })
}

// ─── Print generator (opens a new window) ────────────────────────────────────

const INTEREST_PRINT = {
  hot:   { label: 'HOT BUY',   color: '#b91c1c' },
  good:  { label: 'GOOD DEAL', color: '#15803d' },
  maybe: { label: 'MAYBE',     color: '#b45309' },
  pass:  { label: 'PASS',      color: '#6b7280' },
}

function generatePrintHTML(visit) {
  const sorted = [...visit.cars].sort((a, b) => {
    const laneDiff = (parseInt(a.lane) || 0) - (parseInt(b.lane) || 0)
    if (laneDiff !== 0) return laneDiff
    return (parseInt(a.run) || 0) - (parseInt(b.run) || 0)
  })

  const carRows = sorted.map((car, idx) => {
    const lvl = INTEREST_PRINT[car.interest] || INTEREST_PRINT.maybe
    const runLabel = [car.lane && `Lane ${car.lane}`, car.run && `Run ${car.run}`].filter(Boolean).join(' · ')
    const metaParts = [car.color, car.miles ? `${car.miles} mi` : ''].filter(Boolean).join(' · ')

    const tagBadges = car.tags.map(t =>
      `<span class="tag">${t}</span>`
    ).join('')

    return `
    <div class="car${idx % 2 === 1 ? ' car-alt' : ''}">
      <div class="car-top">
        <div class="car-left">
          ${runLabel ? `<span class="badge badge-dark">${runLabel}</span>` : ''}
          <span class="car-name">${car.year} ${car.make} ${car.model}</span>
          ${metaParts ? `<span class="car-meta">${metaParts}</span>` : ''}
        </div>
        <div class="car-right">
          ${car.maxBid ? `<span class="badge badge-dark">Max $${car.maxBid}</span>` : ''}
          <span class="interest" style="color:${lvl.color};border-color:${lvl.color}">${lvl.label}</span>
        </div>
      </div>
      ${car.tags.length > 0 ? `<div class="tags">${tagBadges}</div>` : ''}
      <div class="details">
        ${car.mechanical ? `<div class="detail-row"><span class="detail-label">Mechanical:</span><span class="detail-text">${car.mechanical}</span></div>` : ''}
        ${car.cosmetic   ? `<div class="detail-row"><span class="detail-label">Cosmetic:</span><span class="detail-text">${car.cosmetic}</span></div>` : ''}
      </div>
    </div>`
  }).join('')

  const meta = [formatDate(visit.date), visit.location, `${sorted.length} vehicle${sorted.length !== 1 ? 's' : ''}`]
    .filter(Boolean).join('  ·  ')

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <title>${visit.name} — Preview Notes</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

    @page { margin: 0.4in 0.45in; }

    body {
      font-family: -apple-system, "Helvetica Neue", Arial, sans-serif;
      font-size: 11pt;
      color: #111;
      background: #fff;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* ── Header ── */
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
      border-bottom: 2.5px solid #111;
      padding-bottom: 6px;
      margin-bottom: 10px;
    }
    .header-title { font-size: 15pt; font-weight: 800; letter-spacing: -0.3px; }
    .header-meta  { font-size: 9.5pt; color: #555; text-align: right; line-height: 1.5; }

    /* ── Cars ── */
    .cars { display: flex; flex-direction: column; gap: 5px; }

    .car {
      border: 1px solid #d1d5db;
      border-radius: 5px;
      padding: 8px 12px;
      break-inside: avoid;
      page-break-inside: avoid;
      background: #ffffff;
    }
    .car-alt { background: #eef4ff; }

    /* top row */
    .car-top {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 8px;
    }
    .car-left  { display: flex; align-items: baseline; flex-wrap: wrap; gap: 6px; flex: 1; min-width: 0; }
    .car-right { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }

    .badge {
      font-size: 8.5pt;
      font-weight: 700;
      padding: 2px 7px;
      border-radius: 3px;
      white-space: nowrap;
    }
    .badge-dark { background: #1f2937; color: #fff; }

    .car-name { font-size: 12pt; font-weight: 700; }
    .car-meta { font-size: 9.5pt; color: #555; }

    .interest {
      font-size: 9pt;
      font-weight: 800;
      letter-spacing: 0.4px;
      padding: 2px 8px;
      border-radius: 3px;
      border: 1.5px solid;
      white-space: nowrap;
    }

    /* tags */
    .tags { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 4px; }
    .tag {
      font-size: 9pt;
      font-weight: 600;
      padding: 1px 7px;
      border-radius: 20px;
      border: 1px solid #999;
      color: #444;
      background: #fff;
    }

    /* detail rows */
    .details { margin-top: 4px; display: flex; flex-direction: column; gap: 3px; }
    .detail-row { display: flex; gap: 6px; font-size: 9.5pt; line-height: 1.4; }
    .detail-label {
      font-weight: 700;
      text-transform: uppercase;
      font-size: 8pt;
      color: #555;
      white-space: nowrap;
      padding-top: 1px;
    }
    .detail-text { color: #222; }

    /* ── Footer ── */
    .footer {
      margin-top: 8px;
      border-top: 1px solid #d1d5db;
      padding-top: 4px;
      font-size: 7.5pt;
      color: #aaa;
      text-align: right;
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-title">${visit.name} — Preview Notes</div>
    <div class="header-meta">${meta}</div>
  </div>
  <div class="cars">
    ${carRows}
  </div>
  <div class="footer">
    Printed ${new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
  </div>
  <script>
    window.onload = function() {
      window.print();
      window.onafterprint = function() { window.close(); };
    };
  </script>
</body>
</html>`
}

function printVisit(visit) {
  const win = window.open('', '_blank', 'width=900,height=700')
  win.document.write(generatePrintHTML(visit))
  win.document.close()
}

// ─── CarForm ─────────────────────────────────────────────────────────────────

function CarForm({ initial, onSave, onCancel }) {
  const [form, setForm] = useState(initial || emptyCarForm)
  const set = (f, v) => setForm(p => ({ ...p, [f]: v }))

  const toggleTag = (label) =>
    set('tags', form.tags.includes(label) ? form.tags.filter(t => t !== label) : [...form.tags, label])

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.year || !form.make || !form.model) return
    onSave({ ...form, id: initial?.id || String(Date.now()) })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="form-label">Lane #</label>
          <input className="form-input" placeholder="7" value={form.lane} onChange={e => set('lane', e.target.value)} />
        </div>
        <div>
          <label className="form-label">Run #</label>
          <input className="form-input" placeholder="58" value={form.run} onChange={e => set('run', e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="form-label">Year *</label>
          <input className="form-input" placeholder="2014" maxLength={4} required value={form.year} onChange={e => set('year', e.target.value)} />
        </div>
        <div>
          <label className="form-label">Make *</label>
          <input className="form-input" placeholder="Ford" required value={form.make} onChange={e => set('make', e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className="form-label">Model *</label>
          <input className="form-input" placeholder="Explorer" required value={form.model} onChange={e => set('model', e.target.value)} />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="form-label">Color</label>
          <input className="form-input" placeholder="Red" value={form.color} onChange={e => set('color', e.target.value)} />
        </div>
        <div>
          <label className="form-label">Mileage</label>
          <input className="form-input" placeholder="168,000" value={form.miles} onChange={e => set('miles', e.target.value)} />
        </div>
        <div className="col-span-2">
          <label className="form-label">Max Bid ($)</label>
          <input className="form-input" placeholder="3,500" value={form.maxBid} onChange={e => set('maxBid', e.target.value)} />
        </div>
      </div>

      <div>
        <label className="form-label">Interest Level</label>
        <div className="grid grid-cols-2 gap-2 mt-1">
          {INTEREST_LEVELS.map(lvl => (
            <button key={lvl.value} type="button" onClick={() => set('interest', lvl.value)}
              className={`py-3 text-sm font-semibold rounded-xl border transition-all ${
                form.interest === lvl.value
                  ? `${lvl.bg} ${lvl.text} ${lvl.border}`
                  : 'bg-gray-50 text-gray-400 border-gray-200'
              }`}>
              {lvl.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="form-label">Quick Tags</label>
        <div className="flex flex-wrap gap-2 mt-1">
          {QUICK_TAGS.map(tag => (
            <button key={tag.label} type="button" onClick={() => toggleTag(tag.label)}
              className={`px-4 py-2 text-sm rounded-full border font-medium transition-all ${
                form.tags.includes(tag.label)
                  ? tag.color
                  : 'bg-gray-100 text-gray-400 border-gray-200'
              }`}>
              {tag.label}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="form-label flex items-center gap-1.5">
          <Wrench size={13} className="text-orange-500" /> Mechanical
        </label>
        <textarea className="form-input resize-none" rows={4}
          placeholder="e.g. Overheating issue, low on coolant, possible sway bar links, knock in front end..."
          value={form.mechanical} onChange={e => set('mechanical', e.target.value)} />
      </div>

      <div>
        <label className="form-label flex items-center gap-1.5">
          <Paintbrush size={13} className="text-blue-500" /> Cosmetic
        </label>
        <textarea className="form-input resize-none" rows={4}
          placeholder="e.g. Minor front bumper damage, light scratches on driver side panels..."
          value={form.cosmetic} onChange={e => set('cosmetic', e.target.value)} />
      </div>

      <div className="flex gap-2 pt-1 pb-4">
        <button type="submit"
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl text-base flex items-center justify-center gap-1.5 transition-colors">
          <Check size={16} />
          {initial ? 'Update Car' : 'Add Car'}
        </button>
        {onCancel && (
          <button type="button" onClick={onCancel}
            className="px-5 py-3.5 border border-gray-300 text-gray-600 rounded-xl text-base font-medium">
            Cancel
          </button>
        )}
      </div>
    </form>
  )
}

// ─── CarCard (screen) ─────────────────────────────────────────────────────────

function CarCard({ car, onEdit, onDelete }) {
  const lvl = getLevel(car.interest)
  return (
    <div className={`rounded-xl border-2 ${lvl.border} ${lvl.bg} overflow-hidden shadow-sm`}>
      <div className="flex items-start justify-between px-4 pt-4 pb-2">
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {(car.run || car.lane) && (
              <span className="bg-gray-800 text-white text-xs font-bold px-2 py-0.5 rounded">
                {[car.lane && `Lane ${car.lane}`, car.run && `Run ${car.run}`].filter(Boolean).join(' · ')}
              </span>
            )}
            <span className={`text-xs font-bold px-2 py-0.5 rounded border ${lvl.bg} ${lvl.text} ${lvl.border}`}>
              {lvl.label}
            </span>
            {car.maxBid && (
              <span className="bg-gray-800 text-white text-xs font-bold px-2 py-0.5 rounded">
                Max ${car.maxBid}
              </span>
            )}
          </div>
          <h3 className="text-lg font-bold text-gray-900 leading-tight">
            {car.year} {car.make} {car.model}
          </h3>
          <p className="text-sm text-gray-500 mt-0.5">
            {[car.color, car.miles && `${car.miles} mi`].filter(Boolean).join(' · ')}
          </p>
        </div>
        <div className="flex gap-1 ml-3 shrink-0">
          <button onClick={() => onEdit(car)}
            className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
            <Pencil size={14} />
          </button>
          <button onClick={() => onDelete(car.id)}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {car.tags.length > 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-1.5">
          {car.tags.map(tag => (
            <span key={tag} className={`text-xs px-2.5 py-0.5 rounded-full border font-medium ${getTagStyle(tag)}`}>
              {tag}
            </span>
          ))}
        </div>
      )}

      {(car.mechanical || car.cosmetic) && (
        <div className="mx-4 mb-4 space-y-2">
          {car.mechanical && (
            <div className="bg-white bg-opacity-70 rounded-lg p-3 border border-white">
              <p className="text-xs font-bold text-orange-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                <Wrench size={11} /> Mechanical
              </p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{car.mechanical}</p>
            </div>
          )}
          {car.cosmetic && (
            <div className="bg-white bg-opacity-70 rounded-lg p-3 border border-white">
              <p className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-1 flex items-center gap-1">
                <Paintbrush size={11} /> Cosmetic
              </p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap leading-relaxed">{car.cosmetic}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ─── VisitForm ────────────────────────────────────────────────────────────────

function VisitForm({ onSave, onCancel }) {
  const [name, setName] = useState('')
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [location, setLocation] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!name) return
    onSave({ id: String(Date.now()), name, date, location, cars: [] })
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="form-label">Auction Name *</label>
        <input className="form-input" placeholder="e.g. Manheim, Copart, ADESA..." required autoFocus
          value={name} onChange={e => setName(e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="form-label">Date</label>
          <input className="form-input" type="date" value={date} onChange={e => setDate(e.target.value)} />
        </div>
        <div>
          <label className="form-label">Location</label>
          <input className="form-input" placeholder="City, State" value={location} onChange={e => setLocation(e.target.value)} />
        </div>
      </div>
      <div className="flex gap-2 pt-1 pb-2">
        <button type="submit"
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3.5 rounded-xl text-base flex items-center justify-center gap-1.5">
          <Check size={16} /> Create Visit
        </button>
        <button type="button" onClick={onCancel}
          className="px-5 py-3.5 border border-gray-300 text-gray-600 rounded-xl text-base font-medium">
          Cancel
        </button>
      </div>
    </form>
  )
}

// ─── VisitCard (home screen tile) ────────────────────────────────────────────

function VisitCard({ visit, onOpen, onDelete }) {
  const counts = {
    hot:   visit.cars.filter(c => c.interest === 'hot').length,
    good:  visit.cars.filter(c => c.interest === 'good').length,
    maybe: visit.cars.filter(c => c.interest === 'maybe').length,
    pass:  visit.cars.filter(c => c.interest === 'pass').length,
  }
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center gap-4 hover:shadow-md transition-shadow cursor-pointer"
      onClick={onOpen}>
      <div className="bg-blue-100 rounded-xl p-3 shrink-0">
        <Car size={22} className="text-blue-600" />
      </div>
      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-gray-900 text-base leading-tight">{visit.name}</h3>
        <div className="flex items-center gap-3 mt-0.5 text-sm text-gray-500 flex-wrap">
          {visit.date     && <span className="flex items-center gap-1"><Calendar size={12} />{formatDate(visit.date)}</span>}
          {visit.location && <span className="flex items-center gap-1"><MapPin size={12} />{visit.location}</span>}
        </div>
        <div className="flex gap-2 mt-2 flex-wrap">
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
            {visit.cars.length} car{visit.cars.length !== 1 ? 's' : ''}
          </span>
          {counts.hot   > 0 && <span className="text-xs bg-red-100    text-red-700   px-2 py-0.5 rounded-full font-medium">{counts.hot} Hot</span>}
          {counts.good  > 0 && <span className="text-xs bg-green-100  text-green-700 px-2 py-0.5 rounded-full font-medium">{counts.good} Good</span>}
          {counts.maybe > 0 && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-medium">{counts.maybe} Maybe</span>}
          {counts.pass  > 0 && <span className="text-xs bg-gray-100   text-gray-500  px-2 py-0.5 rounded-full font-medium">{counts.pass} Pass</span>}
        </div>
      </div>
      <div className="flex gap-1 shrink-0" onClick={e => e.stopPropagation()}>
        <button onClick={onOpen}
          className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
          <ChevronRight size={18} />
        </button>
        <button onClick={() => onDelete(visit.id)}
          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
          <Trash2 size={16} />
        </button>
      </div>
    </div>
  )
}

// ─── VisitDetail ──────────────────────────────────────────────────────────────

function VisitDetail({ visit, onBack, onUpdate }) {
  const [showForm, setShowForm] = useState(false)
  const [editingCar, setEditingCar] = useState(null)
  const [filter, setFilter] = useState('all')

  const addCar = async (car) => {
    await fetch(`/api/visits/${visit.id}/cars`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(car),
    })
    onUpdate({ ...visit, cars: [...visit.cars, car] })
    setShowForm(false)
  }

  const saveCar = async (updated) => {
    await fetch(`/api/visits/${visit.id}/cars/${updated.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    })
    onUpdate({ ...visit, cars: visit.cars.map(c => c.id === updated.id ? updated : c) })
    setEditingCar(null)
  }

  const deleteCar = async (id) => {
    if (!confirm('Remove this car?')) return
    await fetch(`/api/visits/${visit.id}/cars/${id}`, { method: 'DELETE' })
    onUpdate({ ...visit, cars: visit.cars.filter(c => c.id !== id) })
  }

  const counts = {
    all:   visit.cars.length,
    hot:   visit.cars.filter(c => c.interest === 'hot').length,
    good:  visit.cars.filter(c => c.interest === 'good').length,
    maybe: visit.cars.filter(c => c.interest === 'maybe').length,
    pass:  visit.cars.filter(c => c.interest === 'pass').length,
  }

  const filtered = filter === 'all' ? visit.cars : visit.cars.filter(c => c.interest === filter)

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gray-900 text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={onBack} className="p-2.5 hover:bg-gray-700 rounded-xl transition-colors shrink-0">
            <ArrowLeft size={20} />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="font-bold text-base leading-tight truncate">{visit.name}</h1>
            <p className="text-xs text-gray-400 truncate">
              {[formatDate(visit.date), visit.location].filter(Boolean).join(' · ')}
            </p>
          </div>
          <button onClick={() => printVisit(visit)}
            className="p-2.5 bg-gray-700 hover:bg-gray-600 rounded-xl transition-colors shrink-0"
            title="Print">
            <Printer size={18} />
          </button>
          <button onClick={() => { setEditingCar(null); setShowForm(true) }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-semibold transition-colors shrink-0">
            <Plus size={16} /> Add Car
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {showForm && !editingCar && (
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4">New Car</h2>
            <CarForm onSave={addCar} onCancel={() => setShowForm(false)} />
          </div>
        )}

        {visit.cars.length > 0 && (
          <div className="flex gap-2 flex-wrap">
            {[
              { value: 'all',   label: 'All',   cls: 'bg-gray-800 text-white border-gray-800' },
              { value: 'hot',   label: 'Hot',   cls: 'bg-red-100 text-red-700 border-red-300' },
              { value: 'good',  label: 'Good',  cls: 'bg-green-100 text-green-700 border-green-300' },
              { value: 'maybe', label: 'Maybe', cls: 'bg-yellow-100 text-yellow-700 border-yellow-300' },
              { value: 'pass',  label: 'Pass',  cls: 'bg-gray-100 text-gray-500 border-gray-300' },
            ].map(tab => (
              <button key={tab.value} onClick={() => setFilter(tab.value)} style={{minHeight: '40px'}}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  filter === tab.value ? tab.cls : 'bg-white text-gray-400 border-gray-200 hover:bg-gray-50'
                }`}>
                {tab.label}
                {counts[tab.value] > 0 && <span className="ml-1 opacity-70">({counts[tab.value]})</span>}
              </button>
            ))}
          </div>
        )}

        {visit.cars.length === 0 && !showForm && (
          <div className="text-center py-16 text-gray-400">
            <Car size={40} className="mx-auto mb-3 opacity-30" />
            <p className="font-medium">No cars yet</p>
            <p className="text-sm mt-1">Tap <strong>Add Car</strong> to start taking notes</p>
          </div>
        )}

        <div className="space-y-4">
          {filtered.map(car =>
            editingCar?.id === car.id ? (
              <div key={car.id} className="bg-white rounded-xl shadow-sm p-5">
                <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4">Edit Car</h2>
                <CarForm initial={editingCar} onSave={saveCar} onCancel={() => setEditingCar(null)} />
              </div>
            ) : (
              <CarCard key={car.id} car={car} onEdit={setEditingCar} onDelete={deleteCar} />
            )
          )}
        </div>
      </main>
    </div>
  )
}

// ─── HomeScreen ───────────────────────────────────────────────────────────────

function HomeScreen({ visits, onOpenVisit, onDeleteVisit, onAddVisit }) {
  const [showForm, setShowForm] = useState(false)

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-gray-900 text-white shadow-lg">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Car size={22} className="text-blue-400" />
            <span className="text-lg font-bold tracking-tight">Auction Preview</span>
          </div>
          <button onClick={() => setShowForm(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-blue-600 hover:bg-blue-500 rounded-xl text-sm font-semibold transition-colors">
            <Plus size={16} /> New Visit
          </button>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-4 space-y-4">
        {showForm && (
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-4">New Auction Visit</h2>
            <VisitForm onSave={(v) => { onAddVisit(v); setShowForm(false) }} onCancel={() => setShowForm(false)} />
          </div>
        )}

        {visits.length === 0 && !showForm && (
          <div className="text-center py-20 text-gray-400">
            <Car size={48} className="mx-auto mb-4 opacity-20" />
            <p className="text-lg font-semibold">No visits yet</p>
            <p className="text-sm mt-1">Tap <strong>New Visit</strong> to log an auction preview</p>
          </div>
        )}

        {visits.length > 0 && (
          <div>
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-3">
              {visits.length} Visit{visits.length !== 1 ? 's' : ''}
            </h2>
            <div className="space-y-3">
              {[...visits].reverse().map(visit => (
                <VisitCard
                  key={visit.id}
                  visit={visit}
                  onOpen={() => onOpenVisit(visit.id)}
                  onDelete={onDeleteVisit}
                />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [visits, setVisits] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeVisitId, setActiveVisitId] = useState(null)

  useEffect(() => {
    fetch('/api/visits')
      .then(r => r.json())
      .then(data => { setVisits(Array.isArray(data) ? data : []); setLoading(false) })
      .catch(() => setLoading(false))
  }, [])

  const addVisit = async (v) => {
    await fetch('/api/visits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(v),
    })
    setVisits(p => [...p, v])
  }

  const deleteVisit = async (id) => {
    if (!confirm('Delete this visit and all its cars?')) return
    await fetch(`/api/visits/${id}`, { method: 'DELETE' })
    setVisits(p => p.filter(v => v.id !== id))
  }

  const updateVisit = (updated) => setVisits(p => p.map(v => v.id === updated.id ? updated : v))

  const active = visits.find(v => v.id === activeVisitId)

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <p className="text-gray-400 text-sm">Loading...</p>
      </div>
    )
  }

  if (active) {
    return <VisitDetail visit={active} onBack={() => setActiveVisitId(null)} onUpdate={updateVisit} />
  }

  return (
    <HomeScreen
      visits={visits}
      onOpenVisit={setActiveVisitId}
      onDeleteVisit={deleteVisit}
      onAddVisit={addVisit}
    />
  )
}
