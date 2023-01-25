
import { AggregateRoot } from "../../../AggregateRoot"
import { UniqueEntityID } from "../../../UniqueEntityID"

import { CourseInfoCreatedEvent } from "./event"

export interface CourseInfoAGMProps{
  id?: string
  courseName: string
  courseStartDate?: string
  price?: string
  createdAt?: Date
  updatedAt?: Date
}


export class CourseInfoAGM extends AggregateRoot<CourseInfoAGMProps>{
  public get courseName(): string {
    return this.props.courseName;
  }
  public get courseStartDate(): string {
    return this.props.courseStartDate as string;
  }
  public get price(): string {
    return this.props.price as string;
  }

  private constructor(props: CourseInfoAGMProps, id?: UniqueEntityID) {
    super(props, id);
  }
  public static create(props: CourseInfoAGMProps,id?: UniqueEntityID):CourseInfoAGM
  {
      const agm = new CourseInfoAGM(props, id)
      agm.addDomainEvent(new CourseInfoCreatedEvent(agm))
      return agm
  }
}