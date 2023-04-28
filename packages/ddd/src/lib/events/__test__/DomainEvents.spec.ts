import { DomainEvents } from '../DomainEvents';

import { CourseInfoAGM, CourseInfoAGMProps } from './mock/model';
import { AfterCourseInoCreated } from './mock/domainEventHandler';

const props: CourseInfoAGMProps = {
  courseName: 'TestC1',
};

describe('Test DomainEvents', () => {
  const eventHandler = new AfterCourseInoCreated(undefined);
  eventHandler.setupSubscriptions();

  it('should dispatch', async () => {
    const agm = CourseInfoAGM.create(props) ;
    DomainEvents.dispatchEventsForAggregate(agm.id);
  });
});
