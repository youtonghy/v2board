<?php

namespace App\Jobs;

use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\Mail;
use App\Models\MailLog;
use App\Services\MailOAuthService;

class SendEmailJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;
    protected $params;

    public $tries = 3;
    public $timeout = 10;
    /**
     * Create a new job instance.
     *
     * @return void
     */
    public function __construct($params, $queue = 'send_email')
    {
        $this->onQueue($queue);
        $this->params = $params;
    }

    /**
     * Execute the job.
     *
     * @return void
     */
    public function handle()
    {
        if (config('v2board.email_host')) {
            Config::set('mail.host', config('v2board.email_host', env('mail.host')));
            Config::set('mail.port', config('v2board.email_port', env('mail.port')));
            Config::set('mail.encryption', config('v2board.email_encryption', env('mail.encryption')));
            Config::set('mail.username', config('v2board.email_username', env('mail.username')));
            if ((int)config('v2board.email_oauth_enable', 0) === 1) {
                Config::set('mail.password', null);
            } else {
                Config::set('mail.password', config('v2board.email_password', env('mail.password')));
            }
            Config::set('mail.from.address', config('v2board.email_from_address', env('mail.from.address')));
            Config::set('mail.from.name', config('v2board.app_name', 'V2Board'));
        }
        $params = $this->params;
        $email = $params['email'];
        $subject = $params['subject'];
        $params['template_name'] = 'mail.' . config('v2board.email_template', 'default') . '.' . $params['template_name'];
        if ((int)config('v2board.email_oauth_enable', 0) === 1) {
            try {
                $oauthService = new MailOAuthService();
                $accessToken = $oauthService->getAccessToken();
                $swiftMailer = Mail::getSwiftMailer();
                $transport = $swiftMailer->getTransport();
                if (method_exists($transport, 'setAuthMode')) {
                    $transport->setAuthMode('XOAUTH2');
                }
                if (method_exists($transport, 'setUsername') && config('v2board.email_username')) {
                    $transport->setUsername(config('v2board.email_username'));
                }
                if (method_exists($transport, 'setPassword')) {
                    $transport->setPassword($accessToken);
                }
            } catch (\Throwable $e) {
                $error = 'OAuth 2.0: ' . $e->getMessage();
            }
        }
        try {
            if (!isset($error)) {
                sleep(2); 
                Mail::send(
                    $params['template_name'],
                    $params['template_value'],
                    function ($message) use ($email, $subject) {
                        $message->to($email)->subject($subject);
                    }
                );
            }
        } catch (\Exception $e) {
            $error = $e->getMessage();
        }

        $log = [
            'email' => $params['email'],
            'subject' => $params['subject'],
            'template_name' => $params['template_name'],
            'error' => isset($error) ? $error : NULL
        ];

        MailLog::create($log);
        $log['config'] = config('mail');
        return $log;
    }
}
