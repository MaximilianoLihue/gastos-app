'use client'

import { Target, Plus, Pencil, Trash2, X, CheckCircle, PiggyBank, Calendar, ChevronUp } from 'lucide-react'
import { format, differenceInDays, parseISO } from 'date-fns'
import { enUS, es } from 'date-fns/locale'
import { ClassNames } from './page.styles'
import { useLang } from '@/lib/i18n/LangContext'
import { useMetas } from './useMetas'

const COLORS = [
  '#10b981', '#3b82f6', '#f97316', '#a855f7',
  '#ec4899', '#eab308', '#14b8a6', '#f43f5e',
  '#84cc16', '#06b6d4',
]

function formatARS(value: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'ARS', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)
}

function formatUSD(value: number) {
  return new Intl.NumberFormat('es-AR', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(value)
}

function formatGoal(value: number, currency: 'ARS' | 'USD') {
  return currency === 'USD' ? formatUSD(value) : formatARS(value)
}

export function MetasSection() {
  const { t, lang } = useLang()
  const dateLocale = lang === 'en' ? enUS : es

  const {
    goals,
    loading,
    showForm,
    editGoal,
    form, setForm,
    saving,
    deleteConfirm, setDeleteConfirm,
    addingTo, setAddingTo,
    addAmount, setAddAmount,
    toast,
    blueRate,
    totalTarget,
    totalSaved,
    openCreate,
    openEdit,
    closeForm,
    handleSave,
    handleDelete,
    handleAddAmount,
  } = useMetas()

  return (
    <div className={ClassNames.root}>
      <div className={ClassNames.pageHeader}>
        <div>
          <h1 className={ClassNames.pageTitle}>{t.goals.title}</h1>
          <p className={ClassNames.pageSub}>{t.goals.sub}</p>
        </div>
        <button onClick={openCreate} className={ClassNames.newBtn}>
          <Plus className="w-4 h-4" />
          {t.goals.newBtn}
        </button>
      </div>

      {goals.length > 0 && (
        <div className={ClassNames.summaryGrid}>
          <div className={ClassNames.summaryCard}>
            <p className={ClassNames.summaryLabel}>{t.goals.totalGoals}</p>
            <p className={ClassNames.summaryValueWhite}>{goals.length}</p>
          </div>
          <div className={ClassNames.summaryCard}>
            <p className={ClassNames.summaryLabel}>{t.goals.saved}</p>
            <p className={ClassNames.summaryValueGreen}>{formatARS(totalSaved)}</p>
          </div>
          <div className={ClassNames.summaryCard}>
            <p className={ClassNames.summaryLabel}>{t.goals.remaining}</p>
            <p className={ClassNames.summaryValueAmber}>{formatARS(Math.max(0, totalTarget - totalSaved))}</p>
          </div>
        </div>
      )}

      {loading ? (
        <div className={ClassNames.skeletonList}>
          {[1, 2].map(i => <div key={i} className={ClassNames.skeletonCard} />)}
        </div>
      ) : goals.length === 0 ? (
        <div className={ClassNames.emptyWrap}>
          <PiggyBank className="w-14 h-14 mx-auto mb-4 opacity-20" />
          <p className="text-lg">{t.goals.noGoals}</p>
          <p className="text-sm mt-1 mb-5">{t.goals.noGoalsSub}</p>
          <button onClick={openCreate} className={ClassNames.emptyCreateBtn}>
            {t.goals.createFirst}
          </button>
        </div>
      ) : (
        <div className={ClassNames.goalsGrid}>
          {goals.map(goal => {
            const pct = Math.min((Number(goal.current_amount) / Number(goal.target_amount)) * 100, 100)
            const completed = pct >= 100
            const remaining = Math.max(0, Number(goal.target_amount) - Number(goal.current_amount))
            const daysLeft = goal.deadline ? differenceInDays(parseISO(goal.deadline), new Date()) : null

            return (
              <div key={goal.id} className={completed ? ClassNames.goalCardCompleted : ClassNames.goalCardNormal}>
                <div className={ClassNames.goalTopRow}>
                  <div className={ClassNames.goalIconRow}>
                    <div className={ClassNames.goalIconWrap} style={{ backgroundColor: `${goal.color}20` }}>
                      {completed
                        ? <CheckCircle className="w-5 h-5" style={{ color: goal.color }} />
                        : <Target className="w-5 h-5" style={{ color: goal.color }} />}
                    </div>
                    <div>
                      <p className={ClassNames.goalName}>{goal.name}</p>
                      {goal.description && <p className={ClassNames.goalDesc}>{goal.description}</p>}
                    </div>
                  </div>
                  <div className={ClassNames.goalCardActions}>
                    <button onClick={() => openEdit(goal)} className={ClassNames.goalEditBtn}>
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    {deleteConfirm === goal.id ? (
                      <div className={ClassNames.deleteConfirmWrap}>
                        <button onClick={() => handleDelete(goal.id)} className={ClassNames.deleteConfirmBtn}>{t.common.confirm}</button>
                        <button onClick={() => setDeleteConfirm(null)} className={ClassNames.deleteConfirmNoBtn}>{t.common.no}</button>
                      </div>
                    ) : (
                      <button onClick={() => setDeleteConfirm(goal.id)} className={ClassNames.goalDeleteBtn}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {(goal.currency ?? 'ARS') === 'USD' && (
                  <span className={ClassNames.currencyBadge}>USD 🇺🇸</span>
                )}

                <div className={ClassNames.progressSection}>
                  <div className={ClassNames.progressRow}>
                    <span className={ClassNames.progressCurrent}>{formatGoal(Number(goal.current_amount), goal.currency ?? 'ARS')}</span>
                    <span className={ClassNames.progressTarget}>{formatGoal(Number(goal.target_amount), goal.currency ?? 'ARS')}</span>
                  </div>
                  <div className={ClassNames.progressBar}>
                    <div className={ClassNames.progressFill} style={{ width: `${pct}%`, backgroundColor: goal.color }} />
                  </div>
                  <div className={ClassNames.progressMeta}>
                    <span className="text-xs font-semibold" style={{ color: goal.color }}>{pct.toFixed(1)}%</span>
                    {!completed && <span className={ClassNames.progressRemaining}>{t.goals.goalRemaining(formatGoal(remaining, goal.currency ?? 'ARS'))}</span>}
                    {completed && <span className={ClassNames.progressCompleted}>{t.goals.goalCompleted}</span>}
                  </div>
                  {(goal.currency ?? 'ARS') === 'USD' && blueRate && (
                    <p className={ClassNames.arsEquivalent}>
                      ≈ {formatARS(Number(goal.current_amount) * blueRate.venta)} / {formatARS(Number(goal.target_amount) * blueRate.venta)} (blue)
                    </p>
                  )}
                </div>

                {goal.deadline && (
                  <div className="flex items-center gap-1.5 text-xs mb-4" style={{ color: daysLeft !== null && daysLeft < 0 ? '#f43f5e' : daysLeft !== null && daysLeft <= 30 ? '#eab308' : '#6b7280' }}>
                    <Calendar className="w-3.5 h-3.5" />
                    {daysLeft !== null && daysLeft < 0
                      ? t.goals.deadlineExpired(Math.abs(daysLeft))
                      : daysLeft === 0
                      ? t.goals.deadlineToday
                      : t.goals.deadlineFuture(format(parseISO(goal.deadline), "d 'de' MMMM yyyy", { locale: dateLocale }), daysLeft ?? 0)}
                  </div>
                )}

                {addingTo === goal.id ? (
                  <div className={ClassNames.addInputWrap}>
                    <input
                      type="number"
                      placeholder={t.goals.addAmountPlaceholder}
                      value={addAmount}
                      onChange={e => setAddAmount(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleAddAmount(goal)}
                      autoFocus
                      className={ClassNames.addInput}
                    />
                    <button onClick={() => handleAddAmount(goal)} className={ClassNames.addOkBtn}>OK</button>
                    <button onClick={() => { setAddingTo(null); setAddAmount('') }} className={ClassNames.addCancelBtn}>
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ) : (
                  <div className="flex gap-2 mt-2">
                    <button onClick={() => { setAddingTo(goal.id); setAddAmount('') }} className={ClassNames.addSavingBtn}>
                      <ChevronUp className="w-4 h-4" />
                      {t.goals.addAmount}
                    </button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showForm && (
        <div className={ClassNames.modalOverlay}>
          <div className={ClassNames.modalBox}>
            <div className={ClassNames.modalHeader}>
              <h3 className={ClassNames.modalTitle}>{editGoal ? t.goals.formEdit : t.goals.formNew}</h3>
              <button onClick={closeForm} className={ClassNames.modalCloseBtn}><X className="w-5 h-5" /></button>
            </div>

            <div className={ClassNames.modalFields}>
              <div>
                <label className={ClassNames.fieldLabel}>{t.goals.fieldCurrency}</label>
                <div className={ClassNames.currencyToggleWrap}>
                  {(['ARS', 'USD'] as const).map(cur => (
                    <button
                      key={cur}
                      onClick={() => setForm(f => ({ ...f, currency: cur }))}
                      className={
                        form.currency === cur
                          ? cur === 'USD' ? ClassNames.currencyBtnUsdActive : ClassNames.currencyBtnArsActive
                          : ClassNames.currencyBtnInactive
                      }
                    >
                      {cur === 'ARS' ? '🇦🇷 Pesos' : '🇺🇸 Dólares'}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className={ClassNames.fieldLabel}>{t.goals.fieldName}</label>
                <input type="text" placeholder={t.goals.fieldNamePlaceholder} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={ClassNames.textInput} />
              </div>

              <div>
                <label className={ClassNames.fieldLabel}>{t.goals.fieldDescription}</label>
                <input type="text" placeholder={t.goals.fieldDescriptionPlaceholder} value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} className={ClassNames.textInput} />
              </div>

              <div className={ClassNames.amountGrid}>
                <div>
                  <label className={ClassNames.fieldLabel}>{t.goals.fieldTarget(form.currency)}</label>
                  <input type="number" placeholder="0" value={form.target_amount} onChange={e => setForm(f => ({ ...f, target_amount: e.target.value }))} className={ClassNames.textInput} />
                </div>
                <div>
                  <label className={ClassNames.fieldLabel}>{t.goals.fieldSaved}</label>
                  <input type="number" placeholder="0" value={form.current_amount} onChange={e => setForm(f => ({ ...f, current_amount: e.target.value }))} className={ClassNames.textInput} />
                </div>
              </div>

              <div>
                <label className={ClassNames.fieldLabel}>{t.goals.fieldDeadline}</label>
                <input type="date" value={form.deadline} onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))} className={ClassNames.textInput} />
              </div>

              <div>
                <label className={ClassNames.fieldLabel}>{t.goals.fieldColor}</label>
                <div className={ClassNames.colorRow}>
                  {COLORS.map(color => (
                    <button
                      key={color}
                      onClick={() => setForm(f => ({ ...f, color }))}
                      className={ClassNames.colorSwatch}
                      style={{ backgroundColor: color, outline: form.color === color ? `3px solid ${color}` : 'none', outlineOffset: '2px' }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className={ClassNames.modalActions}>
              <button onClick={closeForm} className={ClassNames.cancelBtn}>{t.common.cancel}</button>
              <button onClick={handleSave} disabled={saving || !form.name.trim() || !form.target_amount} className={ClassNames.saveBtn}>
                {saving ? t.common.saving : editGoal ? t.common.save : t.goals.formNew}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className={ClassNames.toast}>
          <CheckCircle className="w-4 h-4" />
          {toast}
        </div>
      )}
    </div>
  )
}
