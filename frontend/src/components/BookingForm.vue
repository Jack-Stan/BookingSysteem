<template>
    <div class="booking">
        <h2>Maak een reservering</h2>

        <label>
            Kies datum
            <input type="date" v-model="date" @change="loadSlots" />
        </label>

        <div v-if="loading">Laden...</div>

        <div v-if="!loading && slots.length">
            <h3>Beschikbare tijden voor {{ date }}</h3>
            <ul class="slots">
                <li v-for="s in slots" :key="s.time" :class="{ full: s.available <= 0 }">
                    <button :disabled="s.available <= 0" @click="selectSlot(s.time)">
                        {{ s.time }} — {{ s.available }} plek(ken) vrij
                    </button>
                </li>
            </ul>
        </div>

        <div v-if="selected">
            <h3>Geselecteerd: {{ selected }}</h3>
            <form @submit.prevent="submitBooking">
                <label>
                    Naam
                    <input v-model="form.name" required />
                </label>
                <label>
                    E-mail
                    <input v-model="form.email" type="email" required />
                </label>
                <label>
                    Telefoon (optioneel)
                    <input v-model="form.phone" />
                </label>
                <button type="submit" :disabled="submitting">Bevestig reservering</button>
            </form>
        </div>

        <div v-if="message" class="message">{{ message }}</div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import axios from 'axios'

const date = ref(new Date().toISOString().substring(0, 10))
const slots = ref<Array<{ time: string, available: number }>>([])
const loading = ref(false)
const selected = ref<string | null>(null)
const submitting = ref(false)
const message = ref('')

const form = ref({ name: '', email: '', phone: '' })

async function loadSlots() {
    loading.value = true
    selected.value = null
    message.value = ''
    try {
        const res = await axios.get(`/api/slots?date=${date.value}`)
        slots.value = res.data
    } catch (err: any) {
        message.value = 'Kan slots niet laden: ' + (err?.message || err)
    } finally {
        loading.value = false
    }
}

function selectSlot(t: string) {
    selected.value = t
}

async function submitBooking() {
    if (!selected.value) return
    submitting.value = true
    message.value = ''
    try {
        const payload = {
            date: date.value,
            time: selected.value,
            name: form.value.name,
            email: form.value.email,
            phone: form.value.phone
        }
        await axios.post('/api/bookings', payload)
        message.value = 'Reservering geplaatst! Controleer je e-mail voor bevestiging.'
        // reset
        form.value = { name: '', email: '', phone: '' }
        selected.value = null
        await loadSlots()
    } catch (err: any) {
        message.value = 'Fout bij reserveren: ' + (err?.response?.data?.message || err?.message || err)
    } finally {
        submitting.value = false
    }
}

// initial load
loadSlots()
</script>

<style scoped>
.booking {
    max-width: 540px;
    margin: 1rem auto;
    padding: 1rem;
    border: 1px solid #eee;
    border-radius: 8px
}

.slots {
    list-style: none;
    padding: 0;
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: .5rem
}

.slots li button {
    width: 100%;
    padding: .5rem;
    border-radius: 6px;
    border: 1px solid #ccc;
    background: white
}

.slots li.full button {
    opacity: .6
}

.message {
    margin-top: 1rem;
    padding: .5rem;
    background: #f0f9ff;
    border: 1px solid #b6e0fe
}

label {
    display: block;
    margin-top: .5rem
}

input {
    width: 100%;
    padding: .4rem;
    margin-top: .25rem
}

button[type="submit"] {
    margin-top: .75rem;
    padding: .6rem 1rem
}
</style>
