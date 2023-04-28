
import { IDomainEvent } from "./IDomainEvent";
import { AggregateRoot } from "../AggregateRoot";
import { UniqueEntityID } from "../UniqueEntityID";
// import { IEventHandler } from "./IEventHandler";

interface IEventStore {
  [index: string]: unknown[]
}
export class DomainEvents {

  
  private static handlersMap : IEventStore = {}
  private static markedAggregates: AggregateRoot<unknown>[] = [];

  /**
   * @method markAggregateForDispatch
   * @static
   * @desc Called by aggregate root objects that have created domain
   * events to eventually be dispatched when the infrastructure commits
   * the unit of work. 
   */

  public static markAggregateForDispatch (aggregate: AggregateRoot<unknown>): void {
    const aggregateFound = !!this.findMarkedAggregateByID(aggregate.id);

    if (!aggregateFound) {
      this.markedAggregates.push(aggregate);
    }
  }

  private static dispatchAggregateEvents (aggregate: AggregateRoot<unknown>): void {
    aggregate.domainEvents.forEach((event: IDomainEvent) => this.dispatch(event));
  }

  private static removeAggregateFromMarkedDispatchList (aggregate: AggregateRoot<unknown>): void {
    const index = this.markedAggregates.findIndex((a) => a.equals(aggregate));
    this.markedAggregates.splice(index, 1);
  }

  private static findMarkedAggregateByID (id: UniqueEntityID): AggregateRoot<unknown> |  unknown {

    let found: AggregateRoot<unknown> | unknown = null;

    for (const aggregate of this.markedAggregates) {
      if (aggregate.id.equals(id)) {
        found = aggregate;
      }
    }

    return found ; 
  }

  public static dispatchEventsForAggregate (id: UniqueEntityID): void {
    const aggregate = this.findMarkedAggregateByID(id) as AggregateRoot<unknown>;

    if (aggregate) {
      this.dispatchAggregateEvents(aggregate);
      aggregate.clearEvents();
      this.removeAggregateFromMarkedDispatchList(aggregate);
    }
  }

  public static register<T extends IDomainEvent>(callback: (event: T) => Promise<void>, eventClassName: string): void {
    
    if (this.handlersMap[eventClassName] === undefined) {
      this.handlersMap[eventClassName] = [];
    }
    this.handlersMap[eventClassName].push(callback);
  }

  public static clearHandlers(): void {
    this.handlersMap = {};
  }

  public static clearMarkedAggregates(): void {
    this.markedAggregates = [];
  }

  private static dispatch (event: IDomainEvent): void {
    const eventClassName: string = event.constructor.name;

    if (this.handlersMap[eventClassName] !== undefined) {
      const handlers: unknown[] = this.handlersMap[eventClassName];
      for (const handler of handlers) {
        const h = handler as (event:IDomainEvent)=>Promise<void>
       h(event)
      }
    }
  }
}