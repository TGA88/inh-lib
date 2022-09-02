
import { MockJobCreatedEvent } from "../events/mockJobCreatedEvent";
import { MockJobDeletedEvent } from "../events/mockJobDeletedEvent";
import { IHandle } from "../../../IHandle";
import { DomainEvents } from "../../../DomainEvents";
import { IDomainEvent } from "../../../IDomainEvent";

export class MockPostToSocial implements IHandle<MockJobCreatedEvent>, IHandle<MockJobDeletedEvent> {
  constructor () {

  }

  /**
   * This is how we may setup subscriptions to domain events.
   */

  setupSubscriptions (): void {
    DomainEvents.register(this.handleJobCreatedEvent, MockJobCreatedEvent.name);
    DomainEvents.register(this.handleDeletedEvent, MockJobDeletedEvent.name);
  }

  /**
   * These are examples of how we define the handlers for domain events.
   */

  handleJobCreatedEvent (event: IDomainEvent): void {
    console.log('A job was created!!!')
  }

  handleDeletedEvent (event: IDomainEvent): void {
    console.log('A job was deleted!!!')
  }
}