import { DomainEvents } from '../../DomainEvents';
import { IDomainEvent } from '../../IDomainEvent';
import { IEventHandler } from '../../IEventHandler';
import { IHandle } from '../../IHandle';
import { CourseInfoCreatedEvent } from './event';

export class AfterCourseInoCreated
  implements IHandle, IEventHandler<CourseInfoCreatedEvent>
{
  private broker: unknown;

  constructor(broker: unknown) {
    // this.setupSubscriptions();
    this.broker = broker;
  }

  async handle(event: CourseInfoCreatedEvent): Promise<void> {
    // const ev:CourseInfoCreatedEvent = event as CourseInfoCreatedEvent

    console.log('onCourseInfoCreatedEvent////////////////////////////');

  }

  setupSubscriptions(): void {
    // this.onCourseInfoCreatedEvent.bind(this);
    DomainEvents.register(this.handle, CourseInfoCreatedEvent.name);
  }

  private async onCourseInfoCreatedEvent(
    event: CourseInfoCreatedEvent
  ): Promise<void> {
    // const { courseInfoAGM} = event;

    console.log('onCourseInfoCreatedEvent////////////////////////////');

    //  broker.publish(eventName,eventData(courseInfoAGM))

    // this.assignInitialUsername.execute({ user })
    //   .then((r) => { console.log(r) })
    //   .catch((err) => { console.log(err) })
  }
}
