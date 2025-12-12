type Task = (({ index }: { index: number }) => Promise<void>)

export function concurrentTasks(
  tasks: Task[],
  limit = 10,
) {
  return new Promise<void>((resolve) => {
    const queue: { task: Task; index: number }[] = [];
    let count = 0;
    const runner = async ({ task, index }: { task: Task; index: number }) => {
      await task({ index });
      count++;
      const next = queue.shift();
      if (next) {
        runner(next);
      }
      if (count === tasks.length) {
        resolve();
      }
    };
    for (let i = 0; i < tasks.length; i += 1) {
      const task = tasks[i];
      const args = { task, index: i };
      if (i < limit) {
        runner(args);
      } else {
        queue.push(args);
      }
    }
  });
}
