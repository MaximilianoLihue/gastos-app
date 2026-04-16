'use client'

import { useState } from 'react'
import { Transaction } from '@/lib/types'
import TransactionForm from '@/components/ui/TransactionForm'
import {
  Plus, Search, Filter, Pencil, Trash2,
  FileSpreadsheet, FileText, ChevronLeft, ChevronRight, ChevronDown,
  ArrowUpDown, Upload, Download, X, CheckCircle, AlertCircle, Tag, Camera, Share2,
} from 'lucide-react'
import { format, addMonths, startOfMonth, subMonths } from 'date-fns'
import { es, enUS } from 'date-fns/locale'
import { ClassNames } from './transaccionesSection.styles'
import { useLang } from '@/lib/i18n/LangContext'
import { useTransacciones, downloadTemplate, PAGE_SIZE } from '@/LogicService/secciones/transacciones/useTransacciones'

function formatARS(value: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)
}

function formatUSD(value: number): string {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
}

function formatAmount(value: number, currency: 'ARS' | 'USD' = 'ARS'): string {
  return currency === 'USD' ? formatUSD(value) : formatARS(value)
}

export function TransaccionesSection() {
  const { t, lang } = useLang()
  const dateLocale = lang === 'en' ? enUS : es
  const [shareToast, setShareToast] = useState(false)

  async function handleShare(tx: Transaction) {
    const typeLabel = tx.type === 'ingreso' ? t.common.income : t.common.expense
    const sign = tx.type === 'ingreso' ? '+' : '-'
    const amountStr = `${sign}${formatAmount(Number(tx.amount), tx.currency ?? 'ARS')} ${tx.currency ?? 'ARS'}`
    const catName = tx.category?.name ?? t.common.noCategory
    const dateStr = format(new Date(tx.date + 'T00:00:00'), 'dd/MM/yyyy', { locale: dateLocale })
    const desc = tx.description || t.common.noDescription
    const text = t.transactions.shareText(typeLabel, desc, amountStr, catName, dateStr)
    if (typeof navigator !== 'undefined' && navigator.share) {
      try { await navigator.share({ text }) } catch {}
    } else {
      await navigator.clipboard.writeText(text)
      setShareToast(true)
      setTimeout(() => setShareToast(false), 2000)
    }
  }

  const {
    transactions,
    loading,
    showForm, setShowForm,
    editTx, setEditTx,
    search, setSearch,
    filterType, setFilterType,
    page, setPage,
    total,
    sortDesc, setSortDesc,
    filterCategory, setFilterCategory,
    catDropdownOpen, setCatDropdownOpen,
    currentMonth, setCurrentMonth,
    deleteConfirm, setDeleteConfirm,
    importing,
    importResult, setImportResult,
    cleaning,
    cleanResult, setCleanResult,
    showClearConfirm, setShowClearConfirm,
    clearing,
    showImportMenu, setShowImportMenu,
    showExportMenu, setShowExportMenu,
    receiptParsing,
    receiptPreview, setReceiptPreview,
    quickCatTx, setQuickCatTx,
    savingCatTx,
    allCategories,
    fileInputRef,
    pdfInputRef,
    receiptInputRef,
    importMenuRef,
    exportMenuRef,
    totalPages,
    handleQuickCategory,
    handleDelete,
    handleEdit,
    handleFormSuccess,
    handleExportExcel,
    handleExportPDF,
    handleImportExcel,
    handleImportPDF,
    handleCleanDuplicates,
    handleClearAll,
    handleImportReceipt,
    handleConfirmReceipt,
  } = useTransacciones()

  return (
    <div className={ClassNames.root}>
      {/* Header */}
      <div className={ClassNames.pageHeader}>
        <div>
          <h1 className={ClassNames.pageTitle}>{t.transactions.title}</h1>
          <div className={ClassNames.monthNav}>
            <button onClick={() => { setCurrentMonth(m => subMonths(m, 1)); setPage(1) }} className={ClassNames.monthNavBtn}>
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className={ClassNames.monthLabel}>{format(currentMonth, 'MMMM yyyy', { locale: dateLocale })}</span>
            <button
              onClick={() => { setCurrentMonth(m => addMonths(m, 1)); setPage(1) }}
              disabled={format(addMonths(currentMonth, 1), 'yyyy-MM') > format(new Date(), 'yyyy-MM')}
              className={ClassNames.monthNavBtnDisabled}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            {format(currentMonth, 'yyyy-MM') !== format(new Date(), 'yyyy-MM') && (
              <button onClick={() => { setCurrentMonth(startOfMonth(new Date())); setPage(1) }} className={ClassNames.todayBtn}>
                {t.common.today}
              </button>
            )}
            <span className={ClassNames.totalCount}>{t.transactions.transactionCount(total)}</span>
          </div>
        </div>
        <div className={ClassNames.headerActions}>
          <input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" className={ClassNames.fileInputHidden} onChange={handleImportExcel} />
          <input ref={pdfInputRef} type="file" accept=".pdf" className={ClassNames.fileInputHidden} onChange={handleImportPDF} />
          <input ref={receiptInputRef} type="file" accept="image/*" className={ClassNames.fileInputHidden} onChange={handleImportReceipt} />

          <button onClick={handleCleanDuplicates} disabled={cleaning || importing} className={ClassNames.btnDuplicates} title={t.transactions.removeDuplicatesTitle}>
            <X className="w-4 h-4" />
            <span className={ClassNames.btnLabel}>{cleaning ? t.transactions.cleaning : t.transactions.duplicates}</span>
          </button>
          <button onClick={() => setShowClearConfirm(true)} disabled={cleaning || importing} className={ClassNames.btnClearAll} title={t.transactions.clearAllTitle}>
            <Trash2 className="w-4 h-4" />
            <span className={ClassNames.btnLabel}>{t.transactions.clear}</span>
          </button>

          <div ref={importMenuRef} className={ClassNames.menuWrap}>
            <button onClick={() => { setShowImportMenu(v => !v); setShowExportMenu(false) }} disabled={importing || receiptParsing} className={ClassNames.btnImport}>
              <Upload className="w-4 h-4 text-yellow-400" />
              <span className={ClassNames.btnLabel}>{importing ? t.transactions.importing : receiptParsing ? t.transactions.analyzing : t.transactions.import}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>
            {showImportMenu && (
              <div className={ClassNames.menuDropdown}>
                <button onClick={() => { setShowImportMenu(false); fileInputRef.current?.click() }} className={ClassNames.menuItem}>
                  <FileSpreadsheet className="w-4 h-4 text-yellow-400" /> Excel
                </button>
                <button onClick={() => { setShowImportMenu(false); pdfInputRef.current?.click() }} className={ClassNames.menuItem}>
                  <FileText className="w-4 h-4 text-red-400" /> {t.transactions.pdfMercadoPago}
                </button>
                <button onClick={() => { setShowImportMenu(false); receiptInputRef.current?.click() }} className={ClassNames.menuItem}>
                  <Camera className="w-4 h-4 text-purple-400" /> {t.transactions.receiptOcr}
                </button>
              </div>
            )}
          </div>

          <div ref={exportMenuRef} className={ClassNames.menuWrap}>
            <button onClick={() => { setShowExportMenu(v => !v); setShowImportMenu(false) }} className={ClassNames.btnExport}>
              <Download className="w-4 h-4 text-emerald-400" />
              <span className={ClassNames.btnLabel}>{t.transactions.export}</span>
              <ChevronDown className="w-3.5 h-3.5 opacity-60" />
            </button>
            {showExportMenu && (
              <div className={ClassNames.menuDropdown}>
                <button onClick={() => { setShowExportMenu(false); handleExportExcel() }} className={ClassNames.menuItem}>
                  <FileSpreadsheet className="w-4 h-4 text-emerald-400" /> Excel
                </button>
                <button onClick={() => { setShowExportMenu(false); handleExportPDF() }} className={ClassNames.menuItem}>
                  <FileText className="w-4 h-4 text-red-400" /> PDF
                </button>
              </div>
            )}
          </div>

          <button onClick={() => { setEditTx(null); setShowForm(true) }} className={ClassNames.btnNew}>
            <Plus className="w-4 h-4" />
            {t.transactions.newBtn}
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className={ClassNames.filtersRow}>
        <div className={ClassNames.searchWrap}>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder={t.transactions.searchPlaceholder}
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            className={ClassNames.searchInput}
          />
        </div>
        <div className={ClassNames.filterGroup}>
          <Filter className="w-4 h-4 text-gray-500 flex-shrink-0" />
          {(['all', 'ingreso', 'gasto'] as const).map((type) => (
            <button
              key={type}
              onClick={() => { setFilterType(type); setPage(1) }}
              className={`${ClassNames.filterBtnBase} ${filterType === type ? type === 'ingreso' ? ClassNames.filterBtnIngreso : type === 'gasto' ? ClassNames.filterBtnGasto : ClassNames.filterBtnAll : ClassNames.filterBtnInactive}`}
            >
              {type === 'all' ? t.transactions.all : type === 'ingreso' ? t.common.incomes : t.common.expenses}
            </button>
          ))}

          <div className={ClassNames.catFilterWrap}>
            <button onClick={() => setCatDropdownOpen(o => !o)} className={filterCategory !== 'all' ? ClassNames.catFilterBtnActive : ClassNames.catFilterBtnInactive}>
              <Tag className="w-3.5 h-3.5" />
              {filterCategory === 'all' ? t.common.category : filterCategory === 'none' ? t.common.noCategory : allCategories.find(c => c.id === filterCategory)?.name ?? t.common.category}
              <ChevronDown className="w-3 h-3" />
            </button>
            {catDropdownOpen && (
              <div className={ClassNames.catDropdown}>
                <div className={ClassNames.catDropdownInner}>
                  <button onClick={() => { setFilterCategory('all'); setPage(1); setCatDropdownOpen(false) }} className={filterCategory === 'all' ? ClassNames.catDropdownItemActive : ClassNames.catDropdownItemInactive}>
                    {t.common.allCategories}
                  </button>
                  <button onClick={() => { setFilterCategory('none'); setPage(1); setCatDropdownOpen(false) }} className={filterCategory === 'none' ? ClassNames.catDropdownItemActive : ClassNames.catDropdownItemInactive}>
                    <div className={ClassNames.catDropdownDot} /> {t.common.noCategory}
                  </button>
                  <div className={ClassNames.catDropdownDivider} />
                  {allCategories.map(cat => (
                    <button key={cat.id} onClick={() => { setFilterCategory(cat.id); setPage(1); setCatDropdownOpen(false) }} className={filterCategory === cat.id ? ClassNames.catDropdownItemActive : ClassNames.catDropdownItemInactive}>
                      <div className={ClassNames.catDropdownColorDot} style={{ backgroundColor: cat.color }} /> {cat.name}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className={ClassNames.tableWrap}>
        <div className={ClassNames.tableScroll}>
          <table className={ClassNames.table}>
            <thead>
              <tr className={ClassNames.thead}>
                <th className={ClassNames.th}>
                  <button onClick={() => { setSortDesc(!sortDesc); setPage(1) }} className={ClassNames.thSortBtn}>
                    {t.transactions.tableDate} <ArrowUpDown className="w-3 h-3" />
                  </button>
                </th>
                <th className={ClassNames.th}>{t.transactions.tableType}</th>
                <th className={ClassNames.th}>{t.transactions.tableCategory}</th>
                <th className={ClassNames.th}>{t.transactions.tableDescription}</th>
                <th className={ClassNames.thRight}>{t.transactions.tableAmount}</th>
                <th className={ClassNames.thRight}>{t.transactions.tableActions}</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className={ClassNames.trLoading}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className={ClassNames.tdLoading}><div className={ClassNames.skeletonCell} /></td>
                    ))}
                  </tr>
                ))
              ) : transactions.length === 0 ? (
                <tr className={ClassNames.trEmpty}>
                  <td colSpan={6} className={ClassNames.tdEmpty}>
                    {search || filterType !== 'all' ? t.transactions.noResults : t.transactions.noTransactions}
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className={ClassNames.trData}>
                    <td className={ClassNames.tdDate}>{format(new Date(tx.date + 'T00:00:00'), 'dd/MM/yyyy', { locale: dateLocale })}</td>
                    <td className={ClassNames.tdType}>
                      <span className={tx.type === 'ingreso' ? ClassNames.typeBadgeIngreso : ClassNames.typeBadgeGasto}>
                        {tx.type === 'ingreso' ? t.common.income : t.common.expense}
                      </span>
                    </td>
                    <td className={ClassNames.tdCategory}>
                      {tx.category ? (
                        <div className={ClassNames.catCellRow}>
                          <div className={ClassNames.catCellDot} style={{ backgroundColor: tx.category.color }} />
                          <span className={ClassNames.catCellName}>{tx.category.name}</span>
                        </div>
                      ) : (
                        <div className={ClassNames.noCatWrap}>
                          {savingCatTx === tx.id ? (
                            <div className={ClassNames.noCatSpinner}>
                              <svg className="w-3.5 h-3.5 animate-spin text-emerald-400" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"/>
                              </svg>
                            </div>
                          ) : (
                            <button onClick={(e) => { e.stopPropagation(); setQuickCatTx(quickCatTx === tx.id ? null : tx.id) }} className={ClassNames.noCatBtn}>
                              {t.common.category}
                            </button>
                          )}
                          {quickCatTx === tx.id && (
                            <div className={ClassNames.quickCatDropdown}>
                              <div className={ClassNames.quickCatInner}>
                                {allCategories.filter(c => c.type === tx.type).map(cat => (
                                  <button key={cat.id} onClick={(e) => { e.stopPropagation(); handleQuickCategory(tx.id, cat.id) }} className={ClassNames.quickCatItem}>
                                    <div className={ClassNames.quickCatDot} style={{ backgroundColor: cat.color }} /> {cat.name}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className={ClassNames.tdDesc}>{tx.description || <span className={ClassNames.tdDescEmpty}>—</span>}</td>
                    <td className={ClassNames.tdAmount}>
                      <span className={tx.type === 'ingreso' ? ClassNames.amountIngreso : ClassNames.amountGasto}>
                        {tx.type === 'ingreso' ? '+' : '-'}{formatAmount(Number(tx.amount), tx.currency ?? 'ARS')}
                      </span>
                      <span className={(tx.currency ?? 'ARS') === 'USD' ? ClassNames.currencyBadgeUsd : ClassNames.currencyBadgeArs}>
                        {tx.currency ?? 'ARS'}
                      </span>
                    </td>
                    <td className={ClassNames.tdActions}>
                      <div className={ClassNames.actionsWrap}>
                        <button onClick={() => handleShare(tx)} className={ClassNames.shareBtn} title={t.transactions.shareTooltip}><Share2 className="w-3.5 h-3.5" /></button>
                        <button onClick={() => handleEdit(tx)} className={ClassNames.editBtn} title={t.common.edit}><Pencil className="w-3.5 h-3.5" /></button>
                        {deleteConfirm === tx.id ? (
                          <div className={ClassNames.deleteConfirmWrap}>
                            <button onClick={() => handleDelete(tx.id)} className={ClassNames.deleteConfirmYes}>{t.common.confirm}</button>
                            <button onClick={() => setDeleteConfirm(null)} className={ClassNames.deleteConfirmNo}>{t.common.no}</button>
                          </div>
                        ) : (
                          <button onClick={() => setDeleteConfirm(tx.id)} className={ClassNames.deleteBtn} title={t.common.delete}><Trash2 className="w-3.5 h-3.5" /></button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className={ClassNames.pagination}>
            <p className={ClassNames.paginationInfo}>{t.transactions.showing((page - 1) * PAGE_SIZE + 1, Math.min(page * PAGE_SIZE, total), total)}</p>
            <div className={ClassNames.paginationControls}>
              <button onClick={() => setPage(Math.max(1, page - 1))} disabled={page === 1} className={ClassNames.paginationBtn}><ChevronLeft className="w-4 h-4" /></button>
              <span className={ClassNames.paginationLabel}>{page} / {totalPages}</span>
              <button onClick={() => setPage(Math.min(totalPages, page + 1))} disabled={page === totalPages} className={ClassNames.paginationBtn}><ChevronRight className="w-4 h-4" /></button>
            </div>
          </div>
        )}
      </div>

      {showForm && (
        <TransactionForm
          transaction={editTx}
          onSuccess={handleFormSuccess}
          onCancel={() => { setShowForm(false); setEditTx(null) }}
        />
      )}

      {importResult && (
        <div className={ClassNames.modalOverlay}>
          <div className={ClassNames.modalBox}>
            <div className={ClassNames.modalHeader}>
              <h3 className={ClassNames.modalTitle}>{t.transactions.importResultTitle}</h3>
              <button onClick={() => setImportResult(null)} className={ClassNames.modalCloseBtn}><X className="w-5 h-5" /></button>
            </div>
            <div className={ClassNames.importResultRow}>
              {importResult.imported > 0 ? <CheckCircle className="w-8 h-8 text-emerald-400 flex-shrink-0" /> : <AlertCircle className="w-8 h-8 text-red-400 flex-shrink-0" />}
              <div>
                <p className={ClassNames.importResultText}>
                  {cleaning ? t.transactions.importDuplicatesText(importResult.imported) : t.transactions.importResultText(importResult.imported, importResult.total)}
                </p>
                {importResult.errors.length > 0 && <p className={ClassNames.importResultSub}>{importResult.errors[0]}</p>}
              </div>
            </div>
            {importResult.errors.length > 0 && (
              <div className={ClassNames.importErrorBox}>
                <p className={ClassNames.importErrorLabel}>{t.common.errors}:</p>
                {importResult.errors.map((err, i) => <p key={i} className={ClassNames.importErrorItem}>• {err}</p>)}
              </div>
            )}
            <p className={ClassNames.importTip}>
              {t.common.tip}:{' '}
              <button onClick={downloadTemplate} className="underline hover:text-gray-300 transition-colors">{t.transactions.importTip}</button>{' '}
              {t.transactions.importTipFull}
            </p>
            <button onClick={() => setImportResult(null)} className={ClassNames.importCloseBtn}>{t.common.close}</button>
          </div>
        </div>
      )}

      {receiptPreview && (
        <div className={ClassNames.modalOverlay}>
          <div className={ClassNames.modalBox}>
            <div className={ClassNames.modalHeader}>
              <h3 className={ClassNames.receiptTitle}><Camera className="w-5 h-5 text-purple-400" />{t.transactions.receiptDetected}</h3>
              <button onClick={() => setReceiptPreview(null)} className={ClassNames.modalCloseBtn}><X className="w-5 h-5" /></button>
            </div>
            <div className={ClassNames.receiptRows}>
              <div className={ClassNames.receiptRow}>
                <span className={ClassNames.receiptLabel}>{t.common.date}</span>
                <input type="date" value={receiptPreview.date} onChange={e => setReceiptPreview(p => p ? { ...p, date: e.target.value } : p)} className={ClassNames.receiptDateInput} />
              </div>
              <div className={ClassNames.receiptRow}>
                <span className={ClassNames.receiptLabel}>{t.common.description}</span>
                <input type="text" value={receiptPreview.description} onChange={e => setReceiptPreview(p => p ? { ...p, description: e.target.value } : p)} className={ClassNames.receiptDescInput} />
              </div>
              <div className={ClassNames.receiptRow}>
                <span className={ClassNames.receiptLabel}>{t.common.amount}</span>
                <input type="number" value={receiptPreview.amount} onChange={e => setReceiptPreview(p => p ? { ...p, amount: Number(e.target.value) } : p)} className={ClassNames.receiptAmountInput} />
              </div>
              <div className={ClassNames.receiptTypeRow}>
                <span className={ClassNames.receiptLabel}>{t.common.type}</span>
                <div className={ClassNames.receiptTypeButtons}>
                  {(['gasto', 'ingreso'] as const).map(txType => (
                    <button key={txType} onClick={() => setReceiptPreview(p => p ? { ...p, type: txType } : p)} className={receiptPreview.type === txType ? txType === 'gasto' ? ClassNames.receiptTypeBtnGastoActive : ClassNames.receiptTypeBtnIngresoActive : ClassNames.receiptTypeBtnInactive}>
                      {txType === 'gasto' ? t.common.expense : t.common.income}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className={ClassNames.receiptActions}>
              <button onClick={() => setReceiptPreview(null)} className={ClassNames.receiptCancelBtn}>{t.common.cancel}</button>
              <button onClick={handleConfirmReceipt} className={ClassNames.receiptConfirmBtn}>{t.transactions.receiptAdd}</button>
            </div>
          </div>
        </div>
      )}

      {showClearConfirm && (
        <div className={ClassNames.modalOverlay}>
          <div className={ClassNames.cleanModalBox}>
            <div className={ClassNames.clearAllIcon}><Trash2 className="w-7 h-7 text-red-400" /></div>
            <h3 className={ClassNames.cleanTitle}>{t.transactions.clearAllConfirmTitle}</h3>
            <p className={ClassNames.cleanText}>{t.transactions.clearAllConfirmText}</p>
            <div className={ClassNames.clearAllActions}>
              <button onClick={() => setShowClearConfirm(false)} disabled={clearing} className={ClassNames.clearAllCancelBtn}>{t.common.cancel}</button>
              <button onClick={handleClearAll} disabled={clearing} className={ClassNames.clearAllConfirmBtn}>
                {clearing ? t.transactions.clearAllDeleting : t.transactions.clearAllConfirmBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {shareToast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-emerald-400 text-sm font-medium shadow-xl animate-fade-in flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />{t.transactions.shareCopied}
        </div>
      )}

      {cleanResult !== null && (
        <div className={ClassNames.modalOverlay}>
          <div className={ClassNames.cleanModalBox}>
            {cleanResult.deleted > 0 ? (
              <>
                <div className={ClassNames.cleanSuccessIcon}><CheckCircle className="w-7 h-7 text-emerald-400" /></div>
                <h3 className={ClassNames.cleanTitle}>{t.transactions.cleanDoneTitle}</h3>
                <p className={ClassNames.cleanText}>{t.transactions.cleanDoneText(cleanResult.deleted)}</p>
              </>
            ) : (
              <>
                <div className={ClassNames.cleanNoneIcon}><CheckCircle className="w-7 h-7 text-blue-400" /></div>
                <h3 className={ClassNames.cleanTitle}>{t.transactions.cleanNoneTitle}</h3>
                <p className={ClassNames.cleanText}>{t.transactions.cleanNoneText}</p>
              </>
            )}
            <button onClick={() => setCleanResult(null)} className={ClassNames.cleanOkBtn}>{t.common.ok}</button>
          </div>
        </div>
      )}
    </div>
  )
}
