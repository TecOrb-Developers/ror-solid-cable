import { Controller } from "@hotwired/stimulus"
import { createConsumer } from "@rails/actioncable"

export default class extends Controller {
  connect() {
    console.log("jj")
    this.channel = createConsumer().subscriptions.create("ChatChannel", {
      connected: this.connected.bind(this),
      disconnected: this.disconnected.bind(this),
      received: this.received.bind(this)
    })
  }

  disconnect() {
    if (this.channel) {
      this.channel.unsubscribe()
    }
  }

  connected() {
    console.log("Connected to chat channel")
    this.appendSystemMessage("You are now connected to the chat")
  }

  disconnected() {
    console.log("Disconnected from chat channel")
  }

  received(data) {
    console.log("Received:", data)
    this.appendMessage(data.sender, data.message, false)
  }

  sendMessage(event) {
    console.log(event)
    event.preventDefault()
    const input = document.getElementById('message-input')
    const message = input.value.trim()
    
    if (message && this.channel) {
      this.channel.perform('speak', { message: message })
      this.appendMessage("You", message, true)
      input.value = ''
      input.focus()
    }
  }

  sendOnEnter(event) {
    if (event.key === 'Enter') {
      this.sendMessage(event)
    }
  }

  appendMessage(sender, message, isSent) {
    const messagesContainer = document.getElementById('chat-messages')
    const messageDiv = document.createElement('div')
    messageDiv.className = `flex ${isSent ? 'justify-end' : 'justify-start'}`
    
    messageDiv.innerHTML = `
      <div class="max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
        isSent 
          ? 'bg-blue-600 text-white rounded-br-none' 
          : 'bg-gray-100 text-gray-800 rounded-bl-none'
      }">
        <div class="text-xs font-medium mb-1 ${
          isSent ? 'text-blue-100' : 'text-gray-500'
        }">${sender}</div>
        <div>${this.escapeHtml(message)}</div>
      </div>
    `
    
    messagesContainer.appendChild(messageDiv)
    messagesContainer.scrollTop = messagesContainer.scrollHeight
  }

  appendSystemMessage(message) {
    const messagesContainer = document.getElementById('chat-messages')
    const messageDiv = document.createElement('div')
    messageDiv.className = 'flex justify-center'
    messageDiv.innerHTML = `
      <div class="bg-gray-200 text-gray-700 text-center text-sm py-1 px-3 rounded-full">
        ${message}
      </div>
    `
    messagesContainer.appendChild(messageDiv)
  }

  escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
  }
}