import { Guard, Result } from "@inh-lib/common"
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

export type CourseInfoAGMParser<T> = (rawData: T) => Result<CourseInfoAGM>

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
  public static create(props: CourseInfoAGMProps,id?: UniqueEntityID):Result<CourseInfoAGM>{
    const guardProps = [
      {argument: props.courseName, argumentName: 'courseName'}
    ]
    const guardResult = Guard.againstNullOrUndefinedBulk(guardProps)
    if(!guardResult.succeeded){
      return Result.fail<CourseInfoAGM>(guardResult.message)
    }
    try {
      const agm = new CourseInfoAGM(props, id)
      console.log("create course Lookup core")
      agm.addDomainEvent(new CourseInfoCreatedEvent(agm))
      return Result.ok<CourseInfoAGM>(agm)
    } catch (error) {
      return Result.fail<CourseInfoAGM>(error)
    }
  }
}