<script setup lang="ts">
import BookingForm from './components/BookingForm.vue'
</script>

<template>
  <div>
    <header style="display:flex;align-items:center;gap:1rem;padding:1rem">
      <img src="./assets/vue.svg" alt="logo" style="height:48px" />
      <h1>Silke Beauty — Reserveringen</h1>
    </header>

    <main>
      <BookingForm />
    </main>
  </div>
</template>

<style scoped>
header {
  border-bottom: 1px solid #eee
}

main {
  padding: 1rem
}
</style>
