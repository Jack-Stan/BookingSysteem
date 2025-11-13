<template>
    <div class="booking">
        <div class="date-row" style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem">
            <button type="button" class="btn-secondary" @click="prevDay">←</button>
            <div style="flex:1; display:flex; gap:0.5rem; align-items:center;">
                <div style="font-weight:700">{{ formatDate(date) }}</div>
                <input type="date" v-model="date" @change="loadSlots" :min="minDate" style="margin-left:auto" />
            </div>
            <button type="button" class="btn-secondary" @click="nextDay">→</button>
        </div>
        <div v-if="view === 'services'" class="panel-header">
            <div class="panel-title">Kies diensten</div>
            <div class="panel-cats" aria-hidden="false">
                <button type="button" class="cat" :class="{ active: !selectedCategory }"
                    @click="selectCategory(null)">Alles</button>
                <button v-for="cat in categories" :key="cat" type="button" class="cat"
                    :class="{ active: selectedCategory === cat }" @click="selectCategory(cat)">{{ cat }}</button>
            </div>
        </div>

        <div v-if="view === 'services'">
            <h3>Kies behandelingen</h3>
            <div class="services">
                <button v-for="s in filteredServices" :key="s.name" type="button"
                    :class="['service-chip', { 'service-selected': selectedServices.includes(s.name) }]"
                    @click="toggleService(s.name)" :aria-pressed="selectedServices.includes(s.name)">
                    <div class="service-top">
                        <span class="service-name">{{ s.name }}</span>
                        <div style="display:flex; align-items:center; gap:0.5rem">
                            <span class="service-price">€{{ s.price }}</span>
                        </div>
                    </div>
                    <div class="service-desc">{{ s.desc }}</div>
                </button>
            </div>
        </div>

        <div v-if="view === 'times'">
            <div
                style="display:flex; justify-content:space-between; align-items:center; gap:1rem; margin-bottom:0.5rem">
                <button type="button" class="btn-secondary" @click="goBackToServices">← Terug</button>
                <div style="font-weight:700">Beschikbare tijden voor {{ date }}</div>
                <div style="width:56px"></div>
            </div>

            <ul class="slots">
                <li v-for="s in slots" :key="s.time">
                    <button :class="['slot-btn', { 'slot-selected': selected === s.time }]" :disabled="s.available <= 0"
                        @click="selectSlot(s.time)">
                        <span>{{ s.time }}</span>
                        <span class="slot-badge">{{ s.available }} vrij</span>
                    </button>
                </li>
            </ul>

            <div class="selection-footer">
                <div class="total">Geselecteerd: <strong>{{ selected || '-' }}</strong></div>
                <div class="cta">
                    <button class="btn-primary" type="button" :disabled="!selected"
                        @click="finalizeSelection">Finaliseer reservering</button>
                </div>
            </div>
        </div>

        <div v-if="view === 'credentials'">
            <div
                style="display:flex; justify-content:space-between; align-items:center; gap:1rem; margin-bottom:0.5rem">
                <button type="button" class="btn-secondary" @click="goBackToTimes">← Terug</button>
                <div style="font-weight:700">Vul je gegevens in</div>
                <div style="width:56px"></div>
            </div>

            <div>
                <h3>Geselecteerd: {{ selected }} <small
                        style="font-weight:400; font-size:0.9rem; color:var(--muted);">(1,5 uur)</small></h3>
                <form class="form" @submit.prevent="submitBooking">
                    <label>
                        Naam
                        <input v-model="form.name" required type="text" />
                    </label>
                    <label>
                        E-mail
                        <input v-model="form.email" type="email" required />
                    </label>
                    <label>
                        Telefoon (optioneel)
                        <input v-model="form.phone" type="tel" />
                    </label>
                    <div class="actions">
                        <button class="btn-primary" type="submit" :disabled="submitting">Finish &amp; Bevestig</button>
                    </div>
                </form>
            </div>
        </div>

        <p v-if="selectedServices.length === 0" class="muted">Kies ten minste één behandeling.</p>

        <div v-if="message" class="message">{{ message }}</div>

        <div v-if="view === 'services'" class="booking-footer">
            <div class="total">Totaal: € {{ total }}</div>
            <div class="cta">
                <button class="btn-primary" :disabled="selectedServices.length === 0" @click="chooseTime">Kies een
                    tijd</button>
            </div>
        </div>

        <div v-if="view === 'confirmation'" class="confirmation"
            style="margin-top:1rem; padding:1rem; border-radius:8px; background:linear-gradient(180deg, #fff, #fffdfa); box-shadow:var(--card-shadow);">
            <h3>Reservering geplaatst</h3>
            <p>{{ message }}</p>
            <div style="display:flex; gap:0.5rem; margin-top:0.75rem;">
                <a class="btn-primary" href="https://instagram.com/" target="_blank" rel="noopener">Bekijk Instagram</a>
                <a class="btn-primary" href="https://facebook.com/" target="_blank" rel="noopener">Bekijk Facebook</a>
                <button type="button" class="btn-secondary" @click="resetToServices">Nieuwe reservering</button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import axios from 'axios'

const date = ref(new Date().toISOString().substring(0, 10))
function formatDate(d: string) {
    try {
        const dt = new Date(d)
        return dt.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })
    } catch (e) {
        return d
    }
}

function addDays(d: string, delta: number) {
    const dt = new Date(d)
    dt.setDate(dt.getDate() + delta)
    return dt.toISOString().substring(0, 10)
}

function prevDay() {
    date.value = addDays(date.value, -1)
    loadSlots()
}

function nextDay() {
    date.value = addDays(date.value, 1)
    loadSlots()
}

const minDate = new Date().toISOString().substring(0, 10)
const slots = ref<Array<{ time: string, available: number }>>([])
const loading = ref(false)
const selected = ref<string | null>(null)
const submitting = ref(false)
const message = ref('')

const servicesOptions = ref<Array<{ name: string, price: number, desc?: string, category?: string }>>([
    { name: 'Luxe spa pedicure', price: 25, desc: 'Warm voetbad, scrubs, vijlen en voetmassage.', category: 'Voetverzorging' },
    { name: 'Luxe spa pedicure met gellak', price: 35, desc: 'Inclusief pedicure + gellak op teennagels.', category: 'Voetverzorging' },
    { name: 'Manicure', price: 15, desc: 'Handverzorging: vijlen, nagelriemen en lakken.', category: 'Manicure' },
    { name: 'Gellack', price: 25, desc: 'Duurzame lak met glans en extra stevigheid.', category: 'Manicure' },
    { name: 'Biab/NNT', price: 30, desc: 'Bouwende gel voor extra stevigheid en vorm.', category: 'Manicure' },
    { name: 'Gel eigen lengte', price: 30, desc: 'Gel aanbrengen op je natuurlijke lengte.', category: 'Manicure' },
    { name: 'Gel met verlenging', price: 45, desc: 'Gel verlenging voor langere nagels en vorm.', category: 'Manicure' },
    { name: 'Gel bijwerking', price: 35, desc: 'Opvullen en onderhoud van bestaande gel.', category: 'Manicure' },
    { name: 'Wimpers liften', price: 45, desc: 'Lifting voor een mooie natuurlijke wimperkrul.', category: 'Wimpers' },
    { name: 'Wenkbrauw lamination', price: 45, desc: 'Lift en fixeer de wenkbrauwwollen voor shape.', category: 'Wenkbrauwen' },
    { name: 'Kleur behandeling - Wenkbrauwen', price: 15, desc: 'Verven van de wenkbrauwen voor vollere look.', category: 'Wenkbrauwen' },
    { name: 'Kleur behandeling - Wimpers', price: 15, desc: 'Verven van wimpers voor meer definitie.', category: 'Wimpers' },
    { name: 'Wenkbrauwen wax', price: 10, desc: 'Wenkbrauw epilatie voor nette vormen.', category: 'Wenkbrauwen' },
    { name: 'Bovenlip wax', price: 5, desc: 'Verwijderen van haartjes boven de bovenlip.', category: 'Gelaatsverzorging' }
])

const selectedServices = ref<string[]>([])
const view = ref<'services' | 'times' | 'credentials' | 'confirmation'>('services')

const categories = ['Gelaatsverzorging', 'Manicure', 'Voetverzorging', 'Wimpers', 'Wenkbrauwen']
const selectedCategory = ref<string | null>(null)

function selectCategory(cat: string | null) {
    if (cat === null) selectedCategory.value = null
    else if (selectedCategory.value === cat) selectedCategory.value = null
    else selectedCategory.value = cat
    view.value = 'services'
}

const filteredServices = computed(() => {
    if (!selectedCategory.value) return servicesOptions.value
    return servicesOptions.value.filter(s => s.category === selectedCategory.value)
})

function goBackToServices() { view.value = 'services' }
function goBackToTimes() { view.value = 'times' }
function finalizeSelection() { if (!selected.value) return; view.value = 'credentials' }

function resetToServices() {
    form.value = { name: '', email: '', phone: '' }
    selected.value = null
    selectedServices.value = []
    message.value = ''
    view.value = 'services'
}

const total = computed(() => selectedServices.value.reduce((acc, name) => {
    const s = servicesOptions.value.find(x => x.name === name)
    return acc + (s ? s.price : 0)
}, 0))

function chooseTime() {
    if (selectedServices.value.length === 0) return
    view.value = 'times'
    loadSlots()
}

const form = ref({ name: '', email: '', phone: '' })

async function loadSlots() {
    loading.value = true
    selected.value = null
    message.value = ''
    try {
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:4000'
        const res = await axios.get(`${apiBase}/api/slots?date=${date.value}`)
        slots.value = res.data
    } catch (err: any) {
        message.value = 'Kan slots niet laden van server; gebruik lokale voorbeelden.'
        slots.value = [
            { time: '09:00', available: 2 },
            { time: '10:00', available: 2 },
            { time: '11:00', available: 1 },
            { time: '12:00', available: 2 },
            { time: '13:00', available: 2 },
            { time: '14:00', available: 2 },
            { time: '15:00', available: 1 },
            { time: '16:00', available: 2 }
        ]
    } finally {
        loading.value = false
    }
}

function selectSlot(t: string) { selected.value = t }

function toggleService(name: string) {
    const i = selectedServices.value.indexOf(name)
    if (i >= 0) selectedServices.value.splice(i, 1)
    else selectedServices.value.push(name)
    selected.value = null
}

async function submitBooking() {
    if (!selected.value) return
    const found = slots.value.find(s => s.time === selected.value)
    if (!found || found.available <= 0) {
        message.value = 'Geselecteerd slot is niet beschikbaar. Kies een ander slot.'
        return
    }
    submitting.value = true
    message.value = ''
    try {
        const apiBase = import.meta.env.VITE_API_URL || 'http://localhost:4000'
        const payload = {
            date: date.value,
            time: selected.value,
            name: form.value.name,
            email: form.value.email,
            phone: form.value.phone,
            services: selectedServices.value
        }
        await axios.post(`${apiBase}/api/bookings`, payload)
        message.value = 'Reservering geplaatst! Controleer je e-mail voor bevestiging.'
        form.value = { name: '', email: '', phone: '' }
        selected.value = null
        selectedServices.value = []
        view.value = 'confirmation'
    } catch (err: any) {
        message.value = 'Fout bij reserveren: ' + (err?.response?.data?.message || err?.message || err)
    } finally {
        submitting.value = false
    }
}

</script>

<style scoped src="../../styles/booking-form.css"></style>