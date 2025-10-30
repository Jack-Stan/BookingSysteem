<script setup lang="ts">
import BookingForm from './components/BookingForm.vue'
</script>

<template>
  <div>
    <header style="padding:1rem 0">
      <div class="brand">
        <img src="./assets/359944470_274562251846758_2041380195044041388_n.jpg" alt="Silke Beauty logo" />
        <div>
          <h1>Silke Beauty</h1>
          <small>Love and Care — Nagels & Beauty</small>
        </div>
      </div>
    </header>

    <main class="layout">
      <section class="hero">
        <div class="card">
          <h2>Welkom bij Silke Beauty</h2>
          <p style="color:var(--muted)">Kies een datum en tijdslot aan de rechterkant om een reservering te maken. Je
            ontvangt een bevestiging per e-mail.</p>
          <ul style="margin-top:1rem;color:var(--muted)">
            <li>Professionele nagelverzorging</li>
            <li>Pedicure & Beauty</li>
            <li>Scherpe prijzen en vriendelijke service</li>
          </ul>
        </div>
      </section>

      <aside>
        <BookingForm />
      </aside>
    </main>
  </div>
</template>

<style scoped src="../styles/app.css"></style>
