<template>
    <div class="booking">
        <h2>Maak een reservering</h2>

        <label>
            Kies datum
            <input type="date" v-model="date" @change="loadSlots" />
        </label>

        <div v-if="loading">Laden...</div>

        <div>
            <h3>Kies behandelingen</h3>
            <div class="services">
                <button v-for="s in servicesOptions" :key="s.name"
                    :class="['service-chip', { 'service-selected': selectedServices.includes(s.name) }]"
                    @click.prevent="toggleService(s.name)">
                    <div class="service-top">
                        <span class="service-name">{{ s.name }}</span>
                        <span class="service-price">€{{ s.price }}</span>
                    </div>
                    <div class="service-desc">{{ s.desc }}</div>
                </button>
            </div>

            <p v-if="selectedServices.length === 0" class="muted">Kies ten minste één behandeling.</p>

            <div class="selection-footer">
                <div class="total">
                    <div>Totaal:</div>
                    <div class="total-amount">€ {{ total }}</div>
                </div>
                <div>
                    <button class="btn-primary" :disabled="selectedServices.length === 0" @click="chooseTime">Kies een
                        tijd</button>
                </div>
            </div>

            <div v-if="showTimes && !loading && slots.length && selectedServices.length">
                <h3>Beschikbare tijden voor {{ date }} <small
                        style="font-weight:400; font-size:0.9rem; color:var(--muted);">(duur: 1 uur)</small></h3>
                <ul class="slots">
                    <li v-for="s in slots" :key="s.time">
                        <button :class="['slot-btn', { 'slot-selected': selected === s.time }]"
                            :disabled="s.available <= 0" @click="selectSlot(s.time)">
                            <span>{{ s.time }}</span>
                            <span class="slot-badge">{{ s.available }} vrij</span>
                        </button>
                    </li>
                </ul>
            </div>
        </div>


        <div v-if="selected">
            <h3>Geselecteerd: {{ selected }} <small style="font-weight:400; font-size:0.9rem; color:var(--muted);">(1
                    uur)</small></h3>
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
                    <button class="btn-primary" type="submit" :disabled="submitting">Bevestig reservering</button>
                </div>
            </form>
        </div>

        <div v-if="message" class="message">{{ message }}</div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import axios from 'axios'

const date = ref(new Date().toISOString().substring(0, 10))
const slots = ref<Array<{ time: string, available: number }>>([])
const loading = ref(false)
const selected = ref<string | null>(null)
const submitting = ref(false)
const message = ref('')

// available services (taken from provided price screenshots)
const servicesOptions = ref<Array<{ name: string, price: number, desc?: string }>>([
    { name: 'Luxe spa pedicure', price: 25, desc: 'Warm voetbad, scrubs, vijlen en voetmassage.' },
    { name: 'Luxe spa pedicure met gellak', price: 35, desc: 'Inclusief pedicure + gellak op teennagels.' },
    { name: 'Manicure', price: 15, desc: 'Handverzorging: vijlen, nagelriemen en lakken.' },
    { name: 'Gellack', price: 25, desc: 'Duurzame lak met glans en extra stevigheid.' },
    { name: 'Biab/NNT', price: 30, desc: 'Bouwende gel voor extra stevigheid en vorm.' },
    { name: 'Gel eigen lengte', price: 30, desc: 'Gel aanbrengen op je natuurlijke lengte.' },
    { name: 'Gel met verlenging', price: 45, desc: 'Gel verlenging voor langere nagels en vorm.' },
    { name: 'Gel bijwerking', price: 35, desc: 'Opvullen en onderhoud van bestaande gel.' },
    { name: 'Wimpers liften', price: 45, desc: 'Lifting voor een mooie natuurlijke wimperkrul.' },
    { name: 'Wenkbrauw lamination', price: 45, desc: 'Lift en fixeer de wenkbrauwwollen voor shape.' },
    { name: 'Kleur behandeling - Wenkbrauwen', price: 15, desc: 'Verven van de wenkbrauwen voor vollere look.' },
    { name: 'Kleur behandeling - Wimpers', price: 15, desc: 'Verven van wimpers voor meer definitie.' },
    { name: 'Wenkbrauwen wax', price: 10, desc: 'Wenkbrauw epilatie voor nette vormen.' },
    { name: 'Bovenlip wax', price: 5, desc: 'Verwijderen van haartjes boven de bovenlip.' }
])

const selectedServices = ref<string[]>([])

const showTimes = ref(false)

const total = computed(() => {
    return selectedServices.value.reduce((acc, name) => {
        const s = servicesOptions.value.find(x => x.name === name)
        return acc + (s ? s.price : 0)
    }, 0)
})

function chooseTime() {
    if (selectedServices.value.length === 0) return
    showTimes.value = true
    // reload slots for selected date
    loadSlots()
}

const form = ref({ name: '', email: '', phone: '' })

async function loadSlots() {
    loading.value = true
    selected.value = null
    message.value = ''
    try {
        const res = await axios.get(`/api/slots?date=${date.value}`)
        slots.value = res.data
    } catch (err: any) {
        // If backend isn't available (dev without backend), fall back to local hourly sample slots
        message.value = 'Kan slots niet laden van server; gebruik lokale voorbeelden (uurelijkse slots).'
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

function selectSlot(t: string) {
    selected.value = t
}

function toggleService(name: string) {
    const i = selectedServices.value.indexOf(name)
    if (i >= 0) selectedServices.value.splice(i, 1)
    else selectedServices.value.push(name)
    // when services change, clear selected slot to force reselect
    selected.value = null
}

async function submitBooking() {
    if (!selected.value) return
    // ensure selected slot is one of the available slots (prevent arbitrary times)
    const found = slots.value.find(s => s.time === selected.value)
    if (!found || found.available <= 0) {
        message.value = 'Geselecteerd slot is niet beschikbaar. Kies een ander slot.'
        return
    }
    submitting.value = true
    message.value = ''
    try {
        const payload = {
            date: date.value,
            time: selected.value,
            name: form.value.name,
            email: form.value.email,
            phone: form.value.phone,
            services: selectedServices.value
        }
        await axios.post('/api/bookings', payload)
        message.value = 'Reservering geplaatst! Controleer je e-mail voor bevestiging.'
        // reset
        form.value = { name: '', email: '', phone: '' }
        selected.value = null
        selectedServices.value = []
        showTimes.value = false
    } catch (err: any) {
        message.value = 'Fout bij reserveren: ' + (err?.response?.data?.message || err?.message || err)
    } finally {
        submitting.value = false
    }
}

// slots are loaded only after user chooses services and clicks "Kies een tijd"
</script>

<style scoped src="../../styles/booking-form.css"></style>
