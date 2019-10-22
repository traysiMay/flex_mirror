import io from 'socket.io-client'
import { fromEvent } from 'rxjs'

export class SocketService {
  init() {
    this.socket = io('localhost:4400')
    return this
  }

  onMessage() {
    return fromEvent(this.socket, 'particle_added')
  }

  onZ() {
    return fromEvent(this.socket, 'cameraZ')
  }
}
