// import { MockJobCreatedEvent } from '../events/mockJobCreatedEvent';
// import { MockJobDeletedEvent } from '../events/mockJobDeletedEvent';
// import { IHandle } from '../../../IHandle';
// import { DomainEvents } from '../../../DomainEvents';
// import { IDomainEvent } from '../../../IDomainEvent';
// import { IEventHandler } from '../../../IEventHandler';

// export class MockPostToSocial implements IHandle {
//   /**
//    * This is how we may setup subscriptions to domain events.
//    */

//   setupSubscriptions(): void {
//     DomainEvents.register(this.handleJobCreatedEvent, MockJobCreatedEvent.name);
//     DomainEvents.register(this.handleDeletedEvent, MockJobDeletedEvent.name);
//   }

//   /**
//    * These are examples of how we define the handlers for domain events.
//    */

//   handleJobCreatedEvent(event: IDomainEvent): void {
//     jobCreatedEventHandler.handle(event);
//   }

//   handleDeletedEvent(event: IDomainEvent): void {
//     jobDeletedEventHandler.handle(event);
//   }
// }

// class JobCreatedEventHandler implements IEventHandler<IDomainEvent> {
//   handle(event: IDomainEvent): void {
//     console.log('A job was created!!!',event);
//   }
// }
// const jobCreatedEventHandler = new JobCreatedEventHandler();

// class JobDeletedEventHandler implements IEventHandler<IDomainEvent> {
//   handle(event: IDomainEvent): void {
//     console.log('A job was deleted!!!',event);
//   }
// }

// const jobDeletedEventHandler = new JobDeletedEventHandler();
