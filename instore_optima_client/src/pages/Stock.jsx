import { useEffect, useState } from 'react'
import PageHeader from '../components/shared/PageHeader'
import DataTable from '../components/shared/DataTable'
import SearchBar from '../components/shared/SearchBar'
import FormModal from '../components/shared/FormModal'
import { getAllStock, updateStock, createStock } from '../services/stockService'
import { getAllProducts } from '../services/productsService'

export default function Stock() {
  // NOTE: Stock page displays products that have STOCK RECORDS in the database.
  // When a new product is created in the Products page, you must also create
  // a corresponding Stock entry (with currentStock and productId).
  // Without a Stock record, the product won't appear here, even if it exists in Products.
  // 
  // Data Flow:
  // 1. Load all Stock records from /api/stock endpoint (shows only products with stock entries)
  // 2. Load all Products for reference to show product names and check min/max stock levels
  // 3. Enrich stock data with product details by joining on productId
  // 4. Filter and display only those stock records that exist in the database
  
  const [data, setData]         = useState([])
  const [products, setProducts] = useState([])
  const [loading, setLoading]   = useState(true)
  const [error, setError]       = useState('')
  const [search, setSearch]     = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing]   = useState(null)
  const [form, setForm]         = useState({ currentStock: '' })
  const [saving, setSaving]     = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createForm, setCreateForm] = useState({ productId: '', currentStock: '' })

  const load = async () => {
    setLoading(true)
    try {
      const [s, p] = await Promise.all([getAllStock(), getAllProducts()])
      setData(s.data || [])
      setProducts(p.data || [])
    } catch { setError('Failed to load stock.') }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  const openEdit = row => {
    setEditing(row)
    setForm({ currentStock: row.currentStock })
    setShowForm(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await updateStock(editing.stockId, { ...editing, currentStock: Number(form.currentStock) })
      setShowForm(false); load()
    } catch { alert('Update failed.') }
    finally { setSaving(false) }
  }

  const handleCreateStock = async () => {
    setSaving(true)
    try {
      if (!createForm.productId) {
        alert('Please select a product')
        setSaving(false)
        return
      }
      await createStock({ productId: Number(createForm.productId), currentStock: Number(createForm.currentStock) || 0 })
      setShowCreateForm(false)
      setCreateForm({ productId: '', currentStock: '' })
      load()
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create stock.')
    } finally {
      setSaving(false)
    }
  }

  const getProduct = id => products.find(p => p.productId === id)

  const getProductsWithoutStock = () => {
    const stockProductIds = new Set(data.map(s => s.productId))
    return products.filter(p => !stockProductIds.has(p.productId))
  }

  const enriched = data.map(row => {
    const prod = getProduct(row.productId)
    const isLow = prod && row.currentStock <= (prod.minStock || 0)
    return { ...row, _productName: prod?.name || `Product #${row.productId}`, _isLow: isLow, _rowClass: isLow ? 'row-low-stock' : '' }
  })

  const filtered = enriched.filter(d =>
    d._productName.toLowerCase().includes(search.toLowerCase())
  )

  const lowCount = enriched.filter(r => r._isLow).length

  const columns = [
    { key: 'stockId',      label: 'ID',           render: r => <span className="text-accent" style={{ fontWeight: 600 }}>#{r.stockId}</span> },
    { key: '_productName', label: 'Product',       render: r => <span style={{ fontWeight: 500, color: 'var(--text-200)' }}>{r._productName}</span> },
    { key: 'currentStock', label: 'Current Stock', render: r => (
      <span style={{ fontWeight: 700, fontSize: 14, color: r._isLow ? '#f87171' : '#34d399' }}>
        {r.currentStock}
      </span>
    )},
    { key: 'status',      label: 'Status',         render: r => r._isLow
      ? <span className="badge-custom badge-danger">Low Stock</span>
      : <span className="badge-custom badge-success">OK</span>
    },
    { key: 'lastUpdated', label: 'Last Updated',   render: r => r.lastUpdated ? new Date(r.lastUpdated).toLocaleDateString('en-IN') : '—' },
    { key: 'actions',     label: 'Actions',        render: r => (
      <button className="btn-icon" onClick={() => openEdit(r)} title="Update Stock">
        <i className="bi bi-pencil"></i>
      </button>
    )}
  ]

  return (
    <div className="animate-in">
      <PageHeader
        title="Stock"
        subtitle="Monitor and update inventory stock levels"
        action={
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {lowCount > 0 && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.15)', color: '#fca5a5', padding: '6px 12px', borderRadius: 'var(--radius-md)', fontSize: 12, fontWeight: 500 }}>
                <i className="bi bi-exclamation-triangle"></i>
                {lowCount} item{lowCount > 1 ? 's' : ''} below minimum
              </div>
            )}
            {getProductsWithoutStock().length > 0 && (
              <button 
                className="btn-primary-custom"
                onClick={() => setShowCreateForm(true)}
                style={{ padding: '6px 14px', fontSize: 12, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 6 }}
              >
                <i className="bi bi-plus-lg"></i>
                Create Stock
              </button>
            )}
          </div>
        }
      />

      <div className="table-card">
        <div className="table-toolbar">
          <p className="table-toolbar-title">
            All Stock <span className="count">{filtered.length}</span>
          </p>
          <div className="table-toolbar-right">
            <SearchBar value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by product..." />
          </div>
        </div>
        <DataTable columns={columns} data={filtered} loading={loading} error={error} />
      </div>

      <FormModal show={showForm} onHide={() => setShowForm(false)} onSubmit={handleSave}
        title="Update Stock Quantity" loading={saving}>
        <div style={{ marginBottom: 14 }}>
          <label className="form-label-custom">Product</label>
          <input className="form-control-custom" value={editing?._productName || ''} disabled
            style={{ opacity: .6, cursor: 'not-allowed' }} />
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="form-label-custom">Current Stock</label>
          <input className="form-control-custom" type="number"
            value={form.currentStock}
            onChange={e => setForm(f => ({ ...f, currentStock: e.target.value }))} />
        </div>
      </FormModal>

      <FormModal show={showCreateForm} onHide={() => setShowCreateForm(false)} onSubmit={handleCreateStock}
        title="Create Stock for Product" loading={saving}>
        <div style={{ marginBottom: 14 }}>
          <label className="form-label-custom">Product *</label>
          <select className="form-control-custom" value={createForm.productId}
            onChange={e => setCreateForm(f => ({ ...f, productId: e.target.value }))}>
            <option value="">— Select a product —</option>
            {getProductsWithoutStock().map(p => (
              <option key={p.productId} value={p.productId}>{p.name}</option>
            ))}
          </select>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label className="form-label-custom">Initial Stock</label>
          <input className="form-control-custom" type="number" min="0"
            value={createForm.currentStock}
            onChange={e => setCreateForm(f => ({ ...f, currentStock: e.target.value }))}
            placeholder="0" />
        </div>
      </FormModal>
    </div>
  )
}