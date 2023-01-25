
import { UniqueEntityID } from "../../../UniqueEntityID";
import { IDomainEvent } from "../../IDomainEvent";
import { CourseInfoAGM } from "./model";

export class CourseInfoCreatedEvent implements IDomainEvent {
  public dateTimeOccurred: Date;
  public courseInfoAGM: CourseInfoAGM

  
  constructor (agm: CourseInfoAGM) {
    this.dateTimeOccurred = new Date();
    this.courseInfoAGM = agm;
  }
  getAggregateId(): UniqueEntityID {
    return this.courseInfoAGM.id
    // throw new Error("Method not implemented.");
  }

}