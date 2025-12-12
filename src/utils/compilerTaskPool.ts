import { fork } from "node:child_process";
import type { BuildResult } from '@/compiler';
import logger from "./logger";

type TaskOption = {
  schema: string,
  templatePath: string,
  buildId: string,
  env: string,
}

type Task = {
  option: TaskOption,
  resolve?: (value: BuildResult) => void,
  reject?: (reason?: any) => void,
}

class CompilerTaskPool {
  private tasks: Task[] = [];
  private maxParallel: number;
  private runningTasks: number = 0;

  constructor(maxParallel: number = 10) {
    this.maxParallel = maxParallel;
  }

  public get runningTaskCount() {
    return this.runningTasks;
  }

  public get taskCount() {
    return this.tasks.length;
  }

  /**
   * 添加任务
   * @param option 任务选项
   * @returns 任务结果
   */
  public addTask(option: TaskOption) {
    return new Promise<BuildResult>((resolve, reject) => {
      logger.log(`新增编译任务: ${option.buildId}`);
      this.tasks.push({
        option,
        resolve,
        reject,
      });
      // 新加入任务时直接尝试运行下一个任务
      this.tryRunNextTask();
    })
  }

  /**
   * 尝试运行下一个任务
   */
  private tryRunNextTask() {
    logger.log(`当前运行任务数: ${this.runningTasks}`);
    if (this.runningTasks >= this.maxParallel) {
      logger.log(`达到最大并发数, 等待下一个任务`);
      return;
    }
    const task = this.tasks.shift();
    if (task) {
      logger.log(`运行编译任务: ${task.option.buildId}`);
      this.runTask(task);
    }
  }

  private runTask(task: Task) {
    this.runningTasks++;
    const { option, resolve, reject } = task;
    const child = fork('./src/scripts/build.js');
    child.send(option);
    child.on('message', (ev: any) => {
      if (ev.isError) {
        logger.log(`编译任务 ${task.option.buildId} 失败`);
        child.kill('SIGINT');
        this.runningTasks--;
        if (reject) {
          const err = new Error(ev.message)
          err.stack = ev.stack
          reject(err)
        }
        this.tryRunNextTask();
        return
      }

      logger.log(`编译任务 ${task.option.buildId} 完成`);
      this.runningTasks--;
      if (resolve) {
        resolve(ev as BuildResult);
      }
      // 运行完任务后尝试运行下一个任务
      this.tryRunNextTask();
    });
    child.on('exit', (ev) => {
      if (reject) {
        reject(new Error('编译任务退出'))
      }
      this.runningTasks--;
      this.tryRunNextTask();
    })
  }
}

export const globalTaskPool = new CompilerTaskPool(10);