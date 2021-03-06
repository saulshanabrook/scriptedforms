import { Widget } from '@phosphor/widgets';

import { JupyterLab, JupyterLabPlugin, ILayoutRestorer } from '@jupyterlab/application';
import { ISettingRegistry } from '@jupyterlab/coreutils';
import { ABCWidgetFactory, DocumentRegistry } from '@jupyterlab/docregistry';
import { ServiceManager, ContentsManager } from '@jupyterlab/services';
import { InstanceTracker } from '@jupyterlab/apputils';

import { ScriptedFormsWidget } from './../app/widget';


const FACTORY = 'ScriptedForms';

namespace CommandIDs {
  export
  const preview = 'scriptedforms:open';
}


export function loadApp(): void {
  const serviceManager = new ServiceManager();
  const contentsManager = new ContentsManager();

  const formWidget = new ScriptedFormsWidget({
    serviceManager,
    contentsManager
  });

  formWidget.form.initiliseScriptedForms();

  window.onresize = () => { formWidget.update(); };
  Widget.attach(formWidget, document.body);
}

export
namespace IScriptedFormsWidgetFactory {
  export
  interface IOptions extends DocumentRegistry.IWidgetFactoryOptions {
    serviceManager: ServiceManager;
    contentsManager: ContentsManager;
  }
}

export
class ScriptedFormsWidgetFactory extends ABCWidgetFactory<ScriptedFormsWidget, DocumentRegistry.IModel> {
  serviceManager: ServiceManager;
  contentsManager: ContentsManager;

  constructor(options: IScriptedFormsWidgetFactory.IOptions) {
    super(options);
    this.serviceManager = options.serviceManager;
    this.contentsManager = options.contentsManager;
  }

  protected createNewWidget(context: DocumentRegistry.Context): ScriptedFormsWidget {
    const formWidget = new ScriptedFormsWidget({
      serviceManager: this.serviceManager,
      contentsManager: this.contentsManager,
      context: context
    });

    formWidget.context.ready.then(() => {
      formWidget.form.initiliseScriptedForms();
    });

    return formWidget;
  }
}

function activate(
  app: JupyterLab, restorer: ILayoutRestorer, settingRegistry: ISettingRegistry
) {
  app.docRegistry.addFileType({
    name: 'scripted-form',
    mimeTypes: ['text/markdown'],
    extensions: ['.form.md'],
    contentType: 'file',
    fileFormat: 'text'
  });

  const factory = new ScriptedFormsWidgetFactory({
    name: FACTORY,
    fileTypes: ['markdown', 'scripted-form'],
    defaultFor: ['scripted-form'],
    readOnly: true,
    serviceManager: app.serviceManager,
    contentsManager: app.serviceManager.contents,
  });

  app.docRegistry.addWidgetFactory(factory);
  const tracker = new InstanceTracker<ScriptedFormsWidget>({
    namespace: '@simonbiggs/scriptedforms'
  });

  restorer.restore(tracker, {
    command: 'docmanager:open',
    args: widget => ({ path: widget.context.path, factory: FACTORY }),
    name: widget => widget.context.path
  });

  factory.widgetCreated.connect((sender, widget) => {
    tracker.add(widget);
    widget.context.pathChanged.connect(() => {
      tracker.save(widget);
    });
  });

  app.commands.addCommand(CommandIDs.preview, {
    label: 'ScriptedForms',
    execute: args => {
      const path = args['path'];
      if (typeof path !== 'string') {
        return;
      }
      return app.commands.execute('docmanager:open', {
        path, factory: FACTORY
      });
    }
  });
}


export const plugin: JupyterLabPlugin<void> = {
  id: '@simonbiggs/scriptedforms:plugin',
  autoStart: true,
  requires: [ILayoutRestorer, ISettingRegistry],
  activate
};
