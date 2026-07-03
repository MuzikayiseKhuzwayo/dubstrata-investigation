import { EventEmitter } from 'events';

class EventBroker extends EventEmitter {
  public broadcast(eventType: string, data: any) {
    this.emit('event', { eventType, data });
  }
}

export const eventBroker = new EventBroker();
